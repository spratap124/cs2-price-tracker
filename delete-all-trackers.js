import dotenv from "dotenv";
import mongoose from "mongoose";
import Tracker from "./src/models/tracker.js";

dotenv.config();

async function deleteAllTrackers() {
  try {
    if (!process.env.MONGODB_URI) {
      throw new Error("MONGODB_URI environment variable is required");
    }

    await mongoose.connect(process.env.MONGODB_URI);
    console.log("Connected to MongoDB Atlas");

    const countBefore = await Tracker.countDocuments();
    console.log(`Found ${countBefore} trackers in database`);

    if (countBefore === 0) {
      console.log("No trackers to delete.");
      await mongoose.disconnect();
      process.exit(0);
    }

    const result = await Tracker.deleteMany({});
    console.log(`\nDeleted ${result.deletedCount} trackers successfully.`);

    await mongoose.disconnect();
    console.log("Disconnected from MongoDB");
    process.exit(0);
  } catch (err) {
    console.error("Failed to delete trackers:", err);
    process.exit(1);
  }
}

deleteAllTrackers();

