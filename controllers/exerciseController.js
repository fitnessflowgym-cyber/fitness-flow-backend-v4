import * as ExerciseModel from "../models/exerciseModel.js";

// ดึงทั้งหมด (GET /api/exercises)
export const getExercises = async (req, res) => {
  try {
    let exercises = await ExerciseModel.getAllExercises();
    res.status(200).json(exercises);
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error fetching exercises", error: error.message });
  }
};

// ดึงแยกหมวดหมู่ (GET /api/exercises/:category)
export const getExercisesByCategory = async (req, res) => {
  try {
    // แก้ไขจาก req.query เป็น req.params
    const { category } = req.params;

    let exercises = await ExerciseModel.getExercisesByCategory(category);

    // ตรวจสอบว่ามีข้อมูลไหม
    if (exercises.length === 0) {
      return res
        .status(404)
        .json({ message: `No exercises found for category: ${category}` });
    }

    res.status(200).json(exercises);
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error fetching exercises", error: error.message });
  }
};

export const getExercisesByID = async (req, res) => {
  try {
    // แก้ไขจาก req.query เป็น req.params
    const { id } = req.params;

    let exercises = await ExerciseModel.getExercisesByID(id);

    // ตรวจสอบว่ามีข้อมูลไหม
    if (exercises.length === 0) {
      return res
        .status(404)
        .json({ message: `No exercises found for id: ${id}` });
    }

    res.status(200).json(exercises);
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error fetching exercises", error: error.message });
  }
};
