import express from "express";
import { getExercises , getExercisesByCategory , getExercisesByID} from "../controllers/exerciseController.js";

const router = express.Router();

router.get("/", getExercises); // GET /api/exercises
router.get("/:category", getExercisesByCategory); // GET /api/exercises
router.get("/id/:id", getExercisesByID);

export default router;
