import * as UserModel from "../models/userModel.js";
import bcrypt from "bcrypt";
import pool from "../config/db.js";
const saltRounds = 10;

export const getUsers = async (req, res) => {
  try {
    const users = await UserModel.getAllUsers();
    res.status(200).json(users);
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error fetching users", error: error.message });
  }
};

export const getUser = async (req, res) => {
  try {
    const user = await UserModel.getUserById(req.params.id);
    if (!user) return res.status(404).json({ message: "User not found" });
    res.status(200).json(user);
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error fetching user", error: error.message });
  }
};

// --- REGISTER ---
export const register = async (req, res) => {
  try {
    const { username, email, password, full_name } = req.body;
    const passwordHash = await bcrypt.hash(password, 10);

    // เรียกใช้ฟังก์ชันที่ทำ Transaction
    const newUser = await UserModel.registerUserWithProfile(
      username,
      email,
      passwordHash,
      full_name
    );

    res.status(201).json({
      message: "User created",
      user: newUser, // ต้องมี newUser.id ส่งกลับมา
    });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Registration failed", error: error.message });
  }
};

// ดึงข้อมูล Profile
export const getUserProfile = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await UserModel.getUserById(id);

    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    res.status(200).json({
      success: true,
      data: user,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// อัปเดตข้อมูล Profile
export const updateProfile = async (req, res) => {
  try {
    const { id } = req.params;
    const profileData = req.body;

    const updatedProfile = await UserModel.updateUserProfile(id, profileData);

    res.status(200).json({
      success: true,
      message: "Profile updated successfully",
      data: updatedProfile,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// --- LOGIN ---
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await UserModel.getUserByEmail(email);

    if (!user)
      return res.status(401).json({ message: "Invalid email or password" });

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch)
      return res.status(401).json({ message: "Invalid email or password" });

    // ส่งข้อมูลกลับโดยแปลงชื่อคอลัมน์ให้ตรงกับที่ React Native เรียกใช้
    res.status(200).json({
      message: "Login successful",
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        name: user.name, // ค่าจาก u.full_name as name
        gender: user.gender,
        birth_date: user.birth_date,
        height_cm: user.height_cm,
        weight_kg: user.weight_kg,
        target_weight_kg: user.target_weight_kg,
        fitness_goal: user.fitness_goal,
        profileImage: user.profileImage, // ค่าจาก up.profile_image_url
      },
    });
  } catch (error) {
    res.status(500).json({ message: "Login failed", error: error.message });
  }
};

// --- DELETE USER ---
export const deleteUser = async (req, res) => {
  try {
    const userId = req.params.id;
    const deletedCount = await UserModel.deleteUserById(userId);

    if (deletedCount === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    // เนื่องจากมี ON DELETE CASCADE ข้อมูลใน user_profiles จะหายไปด้วยอัตโนมัติ
    res.status(200).json({
      message: `User ID ${userId} and its profile have been deleted successfully.`,
    });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error deleting user", error: error.message });
  }
};

export const uploadProfileImage = async (req, res) => {
  try {
    const { id } = req.params;

    // ตรวจสอบว่ามีไฟล์ส่งมาไหม
    if (!req.file) {
      return res.status(400).json({ message: "Please upload a file" });
    }

    // สร้าง URL สำหรับเข้าถึงรูปภาพ (สมมติว่าเซิร์ฟเวอร์รันอยู่ที่พอร์ต 3000)
    const imageUrl = `https://fitness-flow-backend-v2.onrender.com/uploads/profiles/${req.file.filename}`;

    // อัปเดตลง Database
    const query = `
            UPDATE user_profiles 
            SET profile_image_url = $1 
            WHERE user_id = $2
        `;
    await pool.query(query, [imageUrl, id]);

    res.status(200).json({
      message: "Image uploaded successfully",
      imageUrl: imageUrl,
    });
  } catch (error) {
    console.error("Upload Error:", error);
    res.status(500).json({ error: error.message });
  }
};
