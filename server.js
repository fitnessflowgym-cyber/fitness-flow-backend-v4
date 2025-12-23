import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import "dotenv/config";
import axios from "axios";
import userRoutes from "./routes/userRoutes.js";
import exerciseRoutes from "./routes/exerciseRoutes.js";
import workoutRoutes from "./routes/workoutRoutes.js";
import programRoutes from "./routes/programRoutes.js";
import cors from "cors";
const app = express();

app.use(cors());
app.use(express.json());
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ใช้งาน Routes
app.use("/api/users", userRoutes);
app.use("/api/exercises", exerciseRoutes);
app.use("/api/workouts", workoutRoutes);
app.use("/uploads", express.static(path.join(__dirname, "uploads")));
app.use("/api/programs", programRoutes);

app.get("/ping", (req, res) => {
  res.send("pong");
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);

  const url = `https://fitness-flow-backend-v4.onrender.com/ping`; // เปลี่ยนเป็น URL จริงของคุณ
  setInterval(async () => {
    try {
      const response = await axios.get(url);
      console.log(`Self-ping sent to ${url}: Status ${response.status}`);
    } catch (error) {
      console.error(`Error self-pinging: ${error.message}`);
    }
  }, 1 * 60 * 1000); // 10 นาที (หน่วยเป็นมิลลิวินาที)
});
