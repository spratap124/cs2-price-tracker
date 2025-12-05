import dotenv from "dotenv";
import mongoose from "mongoose";
import Tracker from "./src/models/tracker.js";
import { getSkinImageUrl } from "./src/steam/steam.js";

dotenv.config();

async function updateImageUrls() {
  try {
    if (!process.env.MONGODB_URI) {
      throw new Error("MONGODB_URI environment variable is required");
    }

    await mongoose.connect(process.env.MONGODB_URI);
    console.log("Connected to MongoDB Atlas");

    const trackers = await Tracker.find();
    console.log(`Found ${trackers.length} trackers to update`);

    let updated = 0;
    let skipped = 0;
    let failed = 0;

    for (let i = 0; i < trackers.length; i++) {
      const tracker = trackers[i];
      
      // Skip if already has imageUrl
      if (tracker.imageUrl) {
        console.log(`[${i + 1}/${trackers.length}] Skipping "${tracker.skinName}" - already has imageUrl`);
        skipped++;
        continue;
      }

      console.log(`[${i + 1}/${trackers.length}] Fetching image for "${tracker.skinName}"...`);
      
      try {
        const imageUrl = await getSkinImageUrl(tracker.skinName);
        
        if (imageUrl) {
          tracker.imageUrl = imageUrl;
          await tracker.save();
          console.log(`  ✓ Updated with imageUrl: ${imageUrl}`);
          updated++;
        } else {
          console.log(`  ✗ No imageUrl found for "${tracker.skinName}"`);
          failed++;
        }
      } catch (err) {
        console.error(`  ✗ Error fetching image for "${tracker.skinName}":`, err.message);
        failed++;
      }

      // Add a small delay to avoid rate limiting
      if (i < trackers.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    console.log("\n=== Summary ===");
    console.log(`Total trackers: ${trackers.length}`);
    console.log(`Updated: ${updated}`);
    console.log(`Skipped (already had imageUrl): ${skipped}`);
    console.log(`Failed: ${failed}`);

    await mongoose.disconnect();
    console.log("\nDisconnected from MongoDB");
    process.exit(0);
  } catch (err) {
    console.error("Failed to update image URLs:", err);
    process.exit(1);
  }
}

updateImageUrls();

