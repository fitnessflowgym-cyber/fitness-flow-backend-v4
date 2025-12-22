import express from "express";
import {
  saveFullWorkout,
  getWorkoutHistory,
  deleteWorkoutById,
  getPlannedWorkouts,
  createPlannedWorkout,
  deletePlannedWorkout,
} from "../controllers/workoutController.js";

const router = express.Router();

router.post("/save", saveFullWorkout);
router.delete("/delete/:workoutId", deleteWorkoutById);
router.get("/history", getWorkoutHistory);
router.get("/planned/:userId", getPlannedWorkouts);
router.post("/planned/:userId", createPlannedWorkout);
router.delete("/planned/:userId/:planId", deletePlannedWorkout);

export default router;
