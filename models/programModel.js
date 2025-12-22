import pool from "../config/db.js";

export const getProgramsByUserId = async (userId) => {
  const query = `
        SELECT 
            p.id as program_id,
            p.name as program_name,
            p.description,
            p.is_set,
            (
                SELECT json_agg(sub) FROM (
                    SELECT sp.id, sp.name as "dayName", 
                    (
                        SELECT json_agg(ex) FROM (
                            SELECT 
                                e.id as exercise_id, -- เพิ่ม ID ไว้ใช้เช็คด้วย
                                e.name, 
                                e.measurementtype, -- ✅ เพิ่มตรงนี้ เพื่อให้ subPrograms รู้ประเภทการวัดผล
                                '🏋️' as image,
                                pe.sets_count, 
                                pe.reps_count 
                            FROM program_exercises pe
                            JOIN exercises e ON pe.exercise_id = e.id
                            WHERE pe.program_id = sp.id
                        ) ex
                    ) as exercises
                    FROM workout_programs sp 
                    WHERE sp.parent_program_id = p.id
                ) sub
            ) as "subPrograms",
            (
                SELECT json_agg(ex_normal) FROM (
                    SELECT 
                        e.id as exercise_id, 
                        e.name, 
                        e.measurementtype, -- ✅ เพิ่มตรงนี้ เพื่อให้โปรแกรมปกติรู้ประเภทการวัดผล
                        '🏋️' as image
                    FROM program_exercises pe
                    JOIN exercises e ON pe.exercise_id = e.id
                    WHERE pe.program_id = p.id
                ) ex_normal
            ) as exercises
        FROM workout_programs p
        WHERE p.user_id = $1 AND p.parent_program_id IS NULL
        ORDER BY p.created_at DESC;
    `;
  const { rows } = await pool.query(query, [userId]);
  return rows;
};

export const createProgramWithExercises = async (
  userId,
  name,
  description,
  exercises
) => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // เพิ่มหัวข้อโปรแกรม
    const res = await client.query(
      "INSERT INTO workout_programs (user_id, name, description) VALUES ($1, $2, $3) RETURNING id",
      [userId, name, description]
    );
    const programId = res.rows[0].id;

    // เพิ่มรายการท่าในโปรแกรม
    for (let i = 0; i < exercises.length; i++) {
      const ex = exercises[i];
      await client.query(
        `INSERT INTO program_exercises (program_id, exercise_id, sets_count, reps_count, weight_kg, sort_order) 
                 VALUES ($1, $2, $3, $4, $5, $6)`,
        [programId, ex.id, ex.sets || 3, ex.reps || 12, ex.weight || 0, i]
      );
    }

    await client.query("COMMIT");
    return { id: programId, name, description };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
};

export const deleteProgramById = async (id) => {
  const { rowCount } = await pool.query(
    "DELETE FROM workout_programs WHERE id = $1",
    [id]
  );
  return rowCount;
};

export const updateProgramName = async (programId, name, description) => {
  const { rows } = await pool.query(
    "UPDATE workout_programs SET name = $1, description = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3 RETURNING *",
    [name, description, programId]
  );
  return rows[0];
};

export const deleteExerciseFromProgram = async (programId, exerciseId) => {
  const { rowCount } = await pool.query(
    "DELETE FROM program_exercises WHERE program_id = $1 AND exercise_id = $2",
    [programId, exerciseId]
  );
  return rowCount;
};

export const addExerciseToProgram = async (programId, exerciseData) => {
  const { exercise_id, sets, reps, weight } = exerciseData;

  // หาค่า sort_order ล่าสุดก่อน
  const orderRes = await pool.query(
    "SELECT COALESCE(MAX(sort_order), -1) as last_order FROM program_exercises WHERE program_id = $1",
    [programId]
  );
  const nextOrder = orderRes.rows[0].last_order + 1;

  const { rows } = await pool.query(
    `INSERT INTO program_exercises (program_id, exercise_id, sets_count, reps_count, weight_kg, sort_order)
         VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
    [programId, exercise_id, sets || 3, reps || 12, weight || 0, nextOrder]
  );
  return rows[0];
};

export const updateExerciseTarget = async (programId, exerciseId, data) => {
  const { sets, reps, weight } = data;
  const { rows } = await pool.query(
    `UPDATE program_exercises 
         SET sets_count = $1, reps_count = $2, weight_kg = $3 
         WHERE program_id = $4 AND exercise_id = $5 RETURNING *`,
    [sets, reps, weight, programId, exerciseId]
  );
  return rows[0];
};

export const reorderExercises = async (programId, exerciseIds) => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    for (let i = 0; i < exerciseIds.length; i++) {
      await client.query(
        "UPDATE program_exercises SET sort_order = $1 WHERE program_id = $2 AND exercise_id = $3",
        [i, programId, exerciseIds[i]]
      );
    }
    await client.query("COMMIT");
    return true;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
};

export const createSmartProgram = async (
  userId,
  name,
  description,
  weeklyPlan
) => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // 1. บันทึกโปรแกรมหลัก (หัวข้อ Set)
    const mainRes = await client.query(
      `INSERT INTO workout_programs (user_id, name, description, is_set) 
             VALUES ($1, $2, $3, TRUE) RETURNING id`,
      [userId, name, description]
    );
    const mainId = mainRes.rows[0].id;

    // 2. วนลูปบันทึกแต่ละวัน (Day 1, Day 2...)
    for (const day of weeklyPlan) {
      const subRes = await client.query(
        `INSERT INTO workout_programs (user_id, name, parent_program_id) 
                 VALUES ($1, $2, $3) RETURNING id`,
        [userId, day.day_name, mainId]
      );
      const subId = subRes.rows[0].id;

      // 3. บันทึกท่าออกกำลังกายในแต่ละวัน
      for (const ex of day.exercises) {
        await client.query(
          `INSERT INTO program_exercises (program_id, exercise_id, sets_count, reps_count, weight_kg, sort_order) 
                     VALUES ($1, $2, $3, $4, $5, $6)`,
          [
            subId,
            ex.exercise_id,
            ex.sets_count,
            ex.reps_count,
            ex.weight_kg,
            ex.sort_order,
          ]
        );
      }
    }

    await client.query("COMMIT");
    return mainId;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
};
