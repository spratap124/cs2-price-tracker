import express from "express";
import dotenv from "dotenv";
import mongoose from "mongoose";
import cors from "cors";
import trackerRouter from "./src/routes/tracker.js";
import userRouter from "./src/routes/user.js";
import utilityRouter from "./src/routes/utility.js";
import startCron from "./src/cron/priceCheck.js";

dotenv.config();

const app = express();
app.use(
  cors({
    origin: ["http://localhost:5173", "http://127.0.0.1:5500", "https://suryapratap.in/"],
    credentials: true
  })
);
app.use(express.json());

app.use("/track", trackerRouter);
app.use("/user", userRouter);
app.use("/", utilityRouter);

const PORT = process.env.PORT || 3001;

async function start() {
  try {
    if (!process.env.MONGODB_URI) {
      throw new Error("MONGODB_URI environment variable is required");
    }

    await mongoose.connect(process.env.MONGODB_URI);

    console.log("Connected to MongoDB Atlas");

    app.listen(PORT, () => {
      console.log(`Server listening on port ${PORT}`);
    });

    // start the cron worker
    startCron();
  } catch (err) {
    console.error("Failed to start:", err);
    process.exit(1);
  }
}

start();
