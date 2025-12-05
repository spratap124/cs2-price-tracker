import dotenv from "dotenv";

// Load environment variables FIRST before importing any modules
dotenv.config();

import { sendAlert } from "./src/alert/alert.js";

// Test alert with a sample skin
async function testAlert() {
  console.log("Testing Discord alert...");
  console.log("Make sure DISCORD_WEBHOOK_URL is set in your .env file");
  console.log("");

  const testSkinName = "AK-47 | Redline (Field-Tested)";
  const testPrice = 2000;
  const testThreshold = 1800;

  await sendAlert(
    `${testSkinName} dropped below ${testThreshold}`,
    `Price: ${testPrice} (was ${testPrice + 100})`,
    testSkinName
  );

  console.log("\nAlert sent! Check your Discord channel.");
  console.log("If you don't see the message, check:");
  console.log("1. DISCORD_WEBHOOK_URL is set in .env");
  console.log("2. The webhook URL is valid");
  console.log("3. The webhook hasn't been deleted from Discord");
}

testAlert().catch(console.error);

