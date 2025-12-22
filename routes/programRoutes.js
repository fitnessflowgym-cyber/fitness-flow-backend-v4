import express from "express";
import * as ProgramController from "../controllers/programController.js";

const router = express.Router();

// ดึงโปรแกรมทั้งหมดของ User (ใช้ Path Parameter)
router.get("/:userId", ProgramController.getUserPrograms);

// เปลี่ยนชื่อโปรแกรม
router.put("/:id", ProgramController.renameProgram);

// สร้างโปรแกรมใหม่ (userId จะส่งมาใน Body ของ JSON)
router.post("/", ProgramController.createProgram);

// ลบท่าบางท่าออกจากโปรแกรม
router.delete(
  "/:programId/exercise/:exerciseId",
  ProgramController.removeExercise
);

// ลบโปรแกรม (ใช้ ID ของตัวโปรแกรมเอง)
router.delete("/:id", ProgramController.removeProgram);

//  เพิ่มท่าใหม่เข้าไปในโปรแกรมเดิม
router.post("/:id/exercises", ProgramController.addExercise);

// แก้ไขเป้าหมายของท่าในโปรแกรม
router.put("/:id/exercises/:exerciseId", ProgramController.updateTarget);

// จัดลำดับท่าใหม่
router.put("/:id/reorder", ProgramController.reorder);

export default router;
