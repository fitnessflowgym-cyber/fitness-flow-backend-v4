import pool from "../config/db.js";

// 1. บันทึกข้อมูลหลายรายการพร้อมกัน (Bulk Insert)
export const createWorkoutLogs = async (logs) => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const queryText = `
      INSERT INTO workout_logs 
      (user_id, exercise_id, exercise_name, sets, reps, time, weight_kg, workout_date) 
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *;
    `;

    const results = [];
    for (const log of logs) {
      const values = [
        log.user_id,
        log.exercise_id,
        log.exercise_name,
        log.sets,
        log.reps || null,
        log.time || null,
        log.weight_kg,
        log.workout_date || new Date(),
      ];
      const res = await client.query(queryText, values);
      results.push(res.rows[0]);
    }

    await client.query("COMMIT");
    return results;
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }
};

// 2. ลบข้อมูลตามวันที่ (Delete by Date)
// หมายเหตุ: มักใช้ลบทั้ง Workout session ในวันนั้นๆ ของ User คนนั้น
export const deleteLogsByDate = async (userId, date) => {
  const queryText = `
    DELETE FROM workout_logs 
    WHERE user_id = $1 AND DATE(workout_date) = DATE($2)
  `;
  const result = await pool.query(queryText, [userId, date]);
  return result.rowCount; // คืนค่าจำนวนแถวที่ถูกลบ
};

// ดึงประวัติการเล่นทั้งหมดของ User (เรียงตามวันที่ล่าสุด)
export const getLogsByUserId = async (userId) => {
  const queryText = `
    SELECT * FROM workout_logs 
    WHERE user_id = $1 
    ORDER BY workout_date DESC, id ASC
  `;
  const result = await pool.query(queryText, [userId]);
  return result.rows;
};

// ดึงประวัติเฉพาะวันที่ระบุ
export const getLogsByDate = async (userId, date) => {
  const queryText = `
    SELECT * FROM workout_logs 
    WHERE user_id = $1 AND DATE(workout_date) = DATE($2)
    ORDER BY id ASC
  `;
  const result = await pool.query(queryText, [userId, date]);
  return result.rows;
};

export const saveWorkoutSession = async (
  userId,
  startTime,
  endTime,
  duration,
  totalVolume,
  logs
) => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // บันทึกลงตาราง workouts
    const workoutRes = await client.query(
      `INSERT INTO workouts (user_id, start_time, end_time, duration_seconds, total_volume) 
       VALUES ($1, $2, $3, $4, $5) RETURNING id`,
      [userId, startTime, endTime, duration, totalVolume]
    );
    const workoutId = workoutRes.rows[0].id;

    // บันทึกลงตาราง workout_logs
    const logQuery = `
      INSERT INTO workout_logs 
      (user_id, workout_id, exercise_id, exercise_name, sets, reps, time, weight_kg, workout_date) 
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    `;

    for (const log of logs) {
      await client.query(logQuery, [
        userId,
        workoutId,
        log.exercise_id,
        log.exercise_name,
        log.sets,
        log.reps,
        log.time,
        log.weight_kg,
        log.workout_date,
      ]);
    }

    await client.query("COMMIT");
    return { workoutId };
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }
};

// ดึงข้อมูลประวัติแบบ Join เพื่อให้ได้โครงสร้างที่นำไปใช้ง่าย
export const getHistoryWithLogs = async (userId) => {
  const query = `
      SELECT w.*, 
             json_agg(l.*) as details
      FROM workouts w
      LEFT JOIN workout_logs l ON w.id = l.workout_id
      WHERE w.user_id = $1
      GROUP BY w.id
      ORDER BY w.start_time DESC
    `;
  const result = await pool.query(query, [userId]);
  return result.rows;
};

export const deleteWorkout = async (workoutId) => {
  // ต้องมีคำว่า return ตรงนี้!
  return await pool.query("DELETE FROM workouts WHERE id = $1", [workoutId]);
};

// บันทึกแผนการออกกำลังกายใหม่
export const createPlan = async (planData) => {
  const { userId, programId, programName, plannedDate, exercises } = planData;
  const query = `
    INSERT INTO planned_workouts (user_id, program_id, program_name, planned_date, exercises)
    VALUES ($1, $2, $3, $4, $5)
    ON CONFLICT (user_id, planned_date) 
    DO UPDATE SET 
        exercises = EXCLUDED.exercises,
        program_name = EXCLUDED.program_name
    RETURNING *;
  `;
  const { rows } = await pool.query(query, [
    userId,
    programId,
    programName,
    plannedDate,
    JSON.stringify(exercises), // ✅ ต้องบันทึกเป็น String
  ]);
  return rows[0];
};

export const getPlansByUserId = async (userId) => {
  const query = `
    SELECT id, program_id, program_name, planned_date, exercises
    FROM planned_workouts 
    WHERE user_id = $1 
    ORDER BY planned_date ASC
  `;
  const { rows } = await pool.query(query, [userId]);
  return rows;
};

// ลบแผนการออกกำลังกาย
export const deletePlanById = async (userId, planId) => {
  const query = `
    DELETE FROM planned_workouts 
    WHERE user_id = $1 AND id = $2
    RETURNING *;
  `;
  const result = await pool.query(query, [userId, planId]);
  return result.rowCount; // คืนค่าจำนวนแถวที่ถูกลบ (1 คือสำเร็จ, 0 คือไม่พบ)
};
