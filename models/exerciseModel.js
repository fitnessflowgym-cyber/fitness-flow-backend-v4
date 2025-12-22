import pool from "../config/db.js";

// ดึงข้อมูลท่าออกกำลังกายทั้งหมด
export const getAllExercises = async () => {
  const { rows } = await pool.query("SELECT * FROM exercises ORDER BY id ASC");
  return rows;
};

// ดึงข้อมูลท่าออกกำลังกายแยกตาม Category
export const getExercisesByCategory = async (category) => {
  const { rows } = await pool.query(
    "SELECT * FROM exercises WHERE category = $1 ORDER BY name ASC",
    [category]
  );
  return rows;
};

export const getExercisesByID = async (id) => {
  const { rows } = await pool.query(
    "SELECT * FROM exercises WHERE id = $1 ORDER BY name ASC",
    [id]
  );
  return rows;
};
