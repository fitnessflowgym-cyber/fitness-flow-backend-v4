import express from "express";
import multer from "multer";
import path from "path";
import {
  getUsers,
  getUser,
  register,
  login,
  getUserProfile,
  updateProfile,
  deleteUser,
  uploadProfileImage,
} from "../controllers/userController.js";

const router = express.Router();

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/profiles/"); // ต้องสร้างโฟลเดอร์นี้รอไว้ก่อน
  },
  filename: (req, file, cb) => {
    // ตั้งชื่อไฟล์ใหม่เป็น: userId_timestamp.jpg เพื่อป้องกันชื่อซ้ำ
    const userId = req.params.id;
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(
      null,
      `profile-${userId}-${uniqueSuffix}${path.extname(file.originalname)}`
    );
  },
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 2 * 1024 * 1024 }, // จำกัดขนาดรูปไม่เกิน 2MB
});

// Auth & Users
router.get("/", getUsers);
router.post("/register", register);
router.post("/login", login);
router.get("/:id", getUser);

// Profiles
router.get("/:id/profile", getUserProfile); // GET /api/users/1/profile
router.put("/:id/profile", updateProfile); // PUT /api/users/1/profile

// Delete User
router.delete("/:id", deleteUser); // DELETE /api/users/:id
router.post(
  "/:id/upload-image",
  upload.single("profileImage"),
  uploadProfileImage
);

export default router;
