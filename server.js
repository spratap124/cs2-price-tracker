import express from "express";
import dotenv from "dotenv";
import mongoose from "mongoose";
import cors from "cors";
import morgan from "morgan";
import trackerRouter from "./src/routes/tracker.js";
import userRouter from "./src/routes/user.js";
import utilityRouter from "./src/routes/utility.js";
import startCron from "./src/cron/priceCheck.js";
import { generalLimiter } from "./src/middleware/rateLimiter.js";

// Load environment variables based on NODE_ENV
const nodeEnv = process.env.NODE_ENV || "development";
const envFile = nodeEnv === "production" ? ".env.production" : ".env.development";

// Try to load environment-specific file first
const envResult = dotenv.config({ path: envFile });

// If environment-specific file doesn't exist, try .env as fallback
if (envResult.error && envResult.error.code === "ENOENT") {
  console.log(`⚠️  ${envFile} not found, falling back to .env`);
  dotenv.config({ override: false }); // Load .env without overriding existing vars
} else if (!envResult.error) {
  console.log(`✓ Loaded environment from ${envFile}`);
} else {
  // Some other error occurred
  console.warn(`⚠️  Error loading ${envFile}:`, envResult.error.message);
  // Still try to load .env as fallback
  dotenv.config({ override: false });
}

const app = express();
// CORS configuration - allows requests from frontend domain and local development
const allowedOrigins = [
  "https://suryapratap.in",
  "http://192.168.1.11:5173", // Local development
  "https://cs2-api.suryapratap.in",
  // Add your Cloudflare Tunnel subdomain or API subdomain here
  // Example: "https://cs2-api.suryapratap.in"
  ...(process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(",") : [])
];

app.use(
  cors({
    origin: function (origin, callback) {
      // Allow requests with no origin (like mobile apps or curl requests)
      if (!origin) return callback(null, true);

      if (allowedOrigins.indexOf(origin) !== -1) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
    optionsSuccessStatus: 200
  })
);

// HTTP request logger
if (nodeEnv === "production") {
  // Clean, structured format for production - logs method, URL, status, size, and response time
  app.use(morgan(":method :url :status :res[content-length] - :response-time ms"));
} else {
  app.use(morgan("dev"));
}

app.use(express.json());

// Apply general rate limiting to all routes
app.use(generalLimiter);

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
