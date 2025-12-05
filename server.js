import express from "express";
import dotenv from "dotenv";
import mongoose from "mongoose";
import cors from "cors";
import trackerRouter from "./src/routes/tracker.js";
import startCron from "./src/cron/priceCheck.js";

dotenv.config();

const app = express();
app.use(cors({
  origin: "http://localhost:5173",
  credentials: true
}));
app.use(express.json());

app.use("/track", trackerRouter);

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