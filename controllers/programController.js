import * as ProgramModel from "../models/programModel.js";

export const getUserPrograms = async (req, res) => {
  try {
    // เปลี่ยนจาก req.query เป็น req.params
    const { userId } = req.params;
    const programs = await ProgramModel.getProgramsByUserId(userId);

    res.status(200).json({
      success: true,
      data: programs,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching programs",
      error: error.message,
    });
  }
};

export const createNewProgram = async (req, res) => {
  try {
    const { userId, name, description, exercises } = req.body;
    if (!name || !exercises) {
      return res.status(400).json({ message: "Invalid program data" });
    }
    const newProgram = await ProgramModel.createProgramWithExercises(
      userId,
      name,
      description,
      exercises
    );
    res
      .status(201)
      .json({ message: "Program created successfully", data: newProgram });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error creating program", error: error.message });
  }
};

export const removeProgram = async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await ProgramModel.deleteProgramById(id);
    if (deleted === 0)
      return res.status(404).json({ message: "Program not found" });
    res.status(200).json({ message: "Program deleted successfully" });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error deleting program", error: error.message });
  }
};

// เปลี่ยนชื่อโปรแกรม
export const renameProgram = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description } = req.body;
    const updated = await ProgramModel.updateProgramName(id, name, description);
    if (!updated) return res.status(404).json({ message: "Program not found" });
    res
      .status(200)
      .json({ message: "Program renamed successfully", data: updated });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ลบท่าบางท่าในโปรแกรม
export const removeExercise = async (req, res) => {
  try {
    const { programId, exerciseId } = req.params;
    const deleted = await ProgramModel.deleteExerciseFromProgram(
      programId,
      exerciseId
    );
    if (deleted === 0)
      return res
        .status(404)
        .json({ message: "Exercise not found in this program" });
    res.status(200).json({ message: "Exercise removed from program" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// เพิ่มท่าใหม่
export const addExercise = async (req, res) => {
  try {
    const { id } = req.params; // programId
    const exercise = await ProgramModel.addExerciseToProgram(id, req.body);
    res.status(201).json({ success: true, data: exercise });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// อัปเดตเป้าหมายของท่า
export const updateTarget = async (req, res) => {
  try {
    const { id, exerciseId } = req.params;
    const updated = await ProgramModel.updateExerciseTarget(
      id,
      exerciseId,
      req.body
    );
    if (!updated) return res.status(404).json({ message: "Not found" });
    res.status(200).json({ success: true, data: updated });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// จัดลำดับท่าใหม่
export const reorder = async (req, res) => {
  try {
    const { id } = req.params;
    const { exerciseIds } = req.body; // รับเป็น [5, 2, 8] ลำดับใหม่
    await ProgramModel.reorderExercises(id, exerciseIds);
    res.status(200).json({ success: true, message: "Reordered successfully" });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const createProgram = async (req, res) => {
  try {
    const { userId, name, description, isSet, weeklyPlan, exercises } =
      req.body;

    if (isSet && weeklyPlan) {
      // ✅ กรณีเป็น Smart Set (Weekly Plan)
      const programId = await ProgramModel.createSmartProgram(
        userId,
        name,
        description,
        weeklyPlan
      );
      return res
        .status(201)
        .json({ success: true, message: "Smart Set created", programId });
    } else {
      // ✅ กรณีสร้างโปรแกรมเดี่ยวแบบเดิม (แก้ไขจุดนี้)
      // ใช้ Model createProgramWithExercises ที่คุณมีอยู่แล้วด้านบน
      const newProgram = await ProgramModel.createProgramWithExercises(
        userId,
        name,
        description || "My custom workout plan",
        exercises || [] // ถ้าไม่มีท่าส่งมา ให้ส่ง Array ว่าง
      );

      // ส่ง Response กลับไปให้ Frontend รู้ว่าสำเร็จ
      return res.status(201).json({
        success: true,
        message: "Program created successfully",
        data: newProgram,
      });
    }
  } catch (error) {
    console.error("Create Program Error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
};
