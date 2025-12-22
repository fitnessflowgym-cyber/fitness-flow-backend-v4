import * as WorkoutModel from "../models/workoutModel.js";

// บันทึกการออกกำลังกาย (POST)
export const saveWorkout = async (req, res) => {
  try {
    const { logs } = req.body; // รับเป็น Array ของ Logs
    console.log("Logs from Frontend:", logs);
    if (!logs || !Array.isArray(logs) || logs.length === 0) {
      return res.status(400).json({ message: "Invalid logs data" });
    }

    const savedLogs = await WorkoutModel.createWorkoutLogs(logs);
    res
      .status(201)
      .json({ message: "Workout saved successfully", data: savedLogs });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error saving workout", error: error.message });
  }
};

// ลบประวัติการออกกำลังกาย (DELETE)
export const deleteWorkoutByDate = async (req, res) => {
  try {
    const { userId, date } = req.query; // รับ userId และ date ผ่าน Query String
    if (!userId || !date) {
      return res.status(400).json({ message: "userId and date are required" });
    }

    const deletedCount = await WorkoutModel.deleteLogsByDate(userId, date);
    res
      .status(200)
      .json({ message: `Deleted ${deletedCount} sets for date: ${date}` });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error deleting workout", error: error.message });
  }
};

// ดึงประวัติการเล่น (GET)
export const getWorkouts = async (req, res) => {
  try {
    const { userId, date } = req.query; // รับค่าผ่าน Query String

    if (!userId) {
      return res.status(400).json({ message: "userId is required" });
    }

    let logs;
    if (date) {
      // ถ้าระบุวันที่ ให้ดึงเฉพาะวันนั้น
      logs = await WorkoutModel.getLogsByDate(userId, date);
    } else {
      // ถ้าไม่ระบุ ให้ดึงทั้งหมด
      logs = await WorkoutModel.getLogsByUserId(userId);
    }

    res.status(200).json({ data: logs });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error fetching workouts", error: error.message });
  }
};

// 1. บันทึกข้อมูลการออกกำลังกายแบบครบชุด (Workouts + Logs)
export const saveFullWorkout = async (req, res) => {
  try {
    const { userId, startTime, endTime, duration, totalVolume, logs } =
      req.body;

    if (!userId || !logs || logs.length === 0) {
      return res.status(400).json({ message: "Invalid workout data" });
    }

    const result = await WorkoutModel.saveWorkoutSession(
      userId,
      startTime,
      endTime,
      duration,
      totalVolume,
      logs
    );

    res.status(201).json({
      message: "Workout session saved successfully",
      workoutId: result.workoutId,
    });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error saving workout session", error: error.message });
  }
};

// 2. ดึงประวัติการออกกำลังกาย (Get History)
export const getWorkoutHistory = async (req, res) => {
  try {
    const { userId } = req.query;
    if (!userId) return res.status(400).json({ message: "userId required" });

    // ดึงข้อมูลสรุปจากตาราง workouts และท่าที่เล่นจาก workout_logs มาพร้อมกัน (Join)
    const history = await WorkoutModel.getHistoryWithLogs(userId);
    res.status(200).json({ data: history });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// 3. ลบการออกกำลังกายตาม ID (ลบครั้งเดียวหายทั้งชุด)
export const deleteWorkoutById = async (req, res) => {
  try {
    const { workoutId } = req.params;

    // ต้องมี await เพื่อรอผลลัพธ์จาก Model
    const result = await WorkoutModel.deleteWorkout(workoutId);

    // ถ้า Model ไม่ return อะไรเลย result จะเป็น undefined และบรรทัดนี้จะ Error
    if (!result || result.rowCount === 0) {
      return res.status(404).json({ message: "Workout session not found" });
    }

    res.status(200).json({ message: "Workout deleted successfully" });
  } catch (error) {
    console.error("Delete Controller Error:", error);
    res.status(500).json({ error: error.message });
  }
};

export const createPlannedWorkout = async (req, res) => {
  try {
    const { userId } = req.params; // รับจาก /planned/:userId
    const { programId, programName, plannedDate , exercises} = req.body;

    if (!userId || !plannedDate) {
      return res
        .status(400)
        .json({ success: false, message: "Missing required data" });
    }

    const newPlan = await WorkoutModel.createPlan({
      userId,
      programId,
      programName,
      plannedDate,
      exercises
    });

    res.status(201).json({
      success: true,
      message: "Plan saved successfully",
      data: newPlan,
    });
  } catch (error) {
    console.error("Create Plan Error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getPlannedWorkouts = async (req, res) => {
  try {
    const { userId } = req.params;
    const plans = await WorkoutModel.getPlansByUserId(userId);
    res.status(200).json({ success: true, data: plans });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const deletePlannedWorkout = async (req, res) => {
  try {
    const { userId, planId } = req.params;

    if (!userId || !planId) {
      return res
        .status(400)
        .json({ success: false, message: "Missing required parameters" });
    }

    const deletedCount = await WorkoutModel.deletePlanById(userId, planId);

    if (deletedCount === 0) {
      return res
        .status(404)
        .json({ success: false, message: "Plan not found" });
    }

    res.status(200).json({
      success: true,
      message: "Plan deleted successfully",
    });
  } catch (error) {
    console.error("Delete Plan Error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};
