import dotenv from "dotenv";
import mongoose from "mongoose";
import Tracker from "./src/models/tracker.js";
import User from "./src/models/user.js";

dotenv.config();

const TARGET_USER_ID = "386ee364-145b-412d-a685-a3ad2ffb2e7a";

async function updateTrackersUserId() {
  try {
    if (!process.env.MONGODB_URI) {
      throw new Error("MONGODB_URI environment variable is required");
    }

    await mongoose.connect(process.env.MONGODB_URI);
    console.log("Connected to MongoDB Atlas");

    // Verify that the user exists
    const user = await User.findOne({ userId: TARGET_USER_ID });
    if (!user) {
      console.warn(
        `⚠️  Warning: User with userId "${TARGET_USER_ID}" does not exist in the database.`
      );
      console.warn("   The script will still update trackers, but you may want to create the user first.");
      console.warn("   Continue? (This is just a warning, the update will proceed)\n");
    } else {
      console.log(`✓ Found user: ${user.userId}`);
      console.log(`  Discord Webhook: ${user.discordWebhook}\n`);
    }

    // Find all trackers
    const trackers = await Tracker.find();
    console.log(`Found ${trackers.length} trackers in database\n`);

    if (trackers.length === 0) {
      console.log("No trackers to update.");
      await mongoose.disconnect();
      process.exit(0);
    }

    // Count trackers that already have this userId
    const alreadyUpdated = trackers.filter(
      (t) => t.userId === TARGET_USER_ID
    ).length;
    const needsUpdate = trackers.length - alreadyUpdated;

    console.log(`Trackers already with userId "${TARGET_USER_ID}": ${alreadyUpdated}`);
    console.log(`Trackers that need updating: ${needsUpdate}\n`);

    if (needsUpdate === 0) {
      console.log("All trackers already have the correct userId. Nothing to update.");
      await mongoose.disconnect();
      process.exit(0);
    }

    // Update all trackers to have the target userId
    const result = await Tracker.updateMany(
      {},
      {
        $set: {
          userId: TARGET_USER_ID,
          updatedAt: new Date()
        }
      }
    );

    console.log("\n=== Update Summary ===");
    console.log(`Total trackers: ${trackers.length}`);
    console.log(`Already had correct userId: ${alreadyUpdated}`);
    console.log(`Updated: ${result.modifiedCount}`);
    console.log(`Matched: ${result.matchedCount}`);

    // Verify the update
    const verifyCount = await Tracker.countDocuments({
      userId: TARGET_USER_ID
    });
    console.log(`\nVerification: ${verifyCount} trackers now have userId "${TARGET_USER_ID}"`);

    await mongoose.disconnect();
    console.log("\nDisconnected from MongoDB");
    process.exit(0);
  } catch (err) {
    console.error("Failed to update trackers:", err);
    process.exit(1);
  }
}

updateTrackersUserId();

