import pool from "../config/db.js";

// 1. ดึงข้อมูลผู้ใช้งานทั้งหมด
export const getAllUsers = async () => {
  const { rows } = await pool.query(
    "SELECT id, username, email, full_name, created_at FROM users ORDER BY created_at DESC"
  );
  return rows;
};

export const getUserById = async (userId) => {
  const query = `
        SELECT 
            u.id, 
            u.email, 
            COALESCE(up.display_name, u.full_name, 'User') as name,
            up.display_name,
            up.gender, 
            up.birth_date, 
            up.height_cm, 
            up.weight_kg, 
            up.target_weight_kg, 
            up.fitness_goal,
            up.profile_image_url as "profileImage"
        FROM users u
        LEFT JOIN user_profiles up ON u.id = up.user_id
        WHERE u.id = $1;
    `;
  const { rows } = await pool.query(query, [userId]);
  return rows[0];
};

// 3. ฟังก์ชันสำหรับค้นหาด้วย Username (มีประโยชน์ตอนทำระบบ Login)
export const getUserByUsername = async (username) => {
  const { rows } = await pool.query("SELECT * FROM users WHERE username = $1", [
    username,
  ]);
  return rows[0];
};

export const registerUserWithProfile = async (
  username,
  email,
  passwordHash,
  fullName
) => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN"); // เริ่ม Transaction

    // 1. เพิ่มในตาราง users
    const userRes = await client.query(
      `INSERT INTO users (username, email, password_hash, full_name) 
       VALUES ($1, $2, $3, $4) RETURNING id`,
      [username, email, passwordHash, fullName]
    );
    const userId = userRes.rows[0].id;

    // 2. เพิ่มในตาราง user_profiles (ค่าเริ่มต้น)
    await client.query(`INSERT INTO user_profiles (user_id) VALUES ($1)`, [
      userId,
    ]);

    await client.query("COMMIT"); // ยืนยันการบันทึกทั้งหมด
    return { id: userId, username, email, full_name: fullName };
  } catch (error) {
    await client.query("ROLLBACK"); // ยกเลิกหากมีอะไรพลาด
    throw error;
  } finally {
    client.release();
  }
};

// --- CRUD สำหรับ Profiles ---

// Get Profile
export const getProfileByUserId = async (userId) => {
  const { rows } = await pool.query(
    "SELECT * FROM user_profiles WHERE user_id = $1",
    [userId]
  );
  return rows[0];
};

// Update Profile
export const updateUserProfile = async (userId, profileData) => {
  const {
    display_name,
    gender,
    birth_date,
    height_cm,
    weight_kg,
    target_weight_kg,
    fitness_goal,
  } = profileData;

  const query = `
    INSERT INTO user_profiles (user_id, display_name, gender, birth_date, height_cm, weight_kg, target_weight_kg, fitness_goal)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    ON CONFLICT (user_id) DO UPDATE SET
      display_name = EXCLUDED.display_name,
      gender = EXCLUDED.gender,
      birth_date = EXCLUDED.birth_date,
      height_cm = EXCLUDED.height_cm,
      weight_kg = EXCLUDED.weight_kg,
      target_weight_kg = EXCLUDED.target_weight_kg,
      fitness_goal = EXCLUDED.fitness_goal,
      updated_at = CURRENT_TIMESTAMP
    RETURNING *;
  `;

  const values = [
    userId,
    display_name,
    gender,
    birth_date,
    height_cm,
    weight_kg,
    target_weight_kg,
    fitness_goal,
  ];
  const { rows } = await pool.query(query, values);
  return rows[0];
};

export const createUser = async (username, email, passwordHash, fullName) => {
  const { rows } = await pool.query(
    `INSERT INTO users (username, email, password_hash, full_name) 
     VALUES ($1, $2, $3, $4) 
     RETURNING id, username, email, full_name`,
    [username, email, passwordHash, fullName]
  );
  return rows[0];
};

export const getUserByEmail = async (email) => {
  const query = `
        SELECT 
            u.id, 
            u.username, 
            u.email, 
            u.password_hash, 
            u.full_name as name,           -- เปลี่ยน full_name เป็น name ให้ตรงกับที่แอปใช้
            up.gender, 
            up.birth_date, 
            up.height_cm, 
            up.weight_kg, 
            up.target_weight_kg, 
            up.fitness_goal,
            up.profile_image_url as "profileImage" -- เปลี่ยนชื่อให้ตรงกับตัวแปรใน React
        FROM users u
        LEFT JOIN user_profiles up ON u.id = up.user_id
        WHERE u.email = $1
    `;
  const result = await pool.query(query, [email]);
  return result.rows[0];
};

// --- DELETE USER ---
export const deleteUserById = async (id) => {
  const { rowCount } = await pool.query("DELETE FROM users WHERE id = $1", [
    id,
  ]);
  return rowCount; // จะคืนค่าจำนวนแถวที่ถูกลบ (ถ้าลบสำเร็จจะเป็น 1)
};
