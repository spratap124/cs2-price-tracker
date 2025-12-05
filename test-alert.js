import dotenv from "dotenv";
import readline from "readline";

// Load environment variables FIRST before importing any modules
dotenv.config();

import { sendAlert } from "./src/alert/alert.js";
import { getSkinImageUrl } from "./src/steam/steam.js";

// Create readline interface for user input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Helper function to ask a question and return the answer
function askQuestion(question) {
  return new Promise(resolve => {
    rl.question(question, answer => {
      resolve(answer);
    });
  });
}

// Display menu and get user choice
async function showMenu() {
  console.log("\n=== Discord Alert Test Menu ===\n");
  console.log("1. Buy Alert (Green) - Price dropped below target (good for buying)");
  console.log("2. Sell Alert (Green) - Price rose above target (good for selling)");
  console.log("3. Buy-Bad Alert (Red) - Price rose above buy target (bad for buying)");
  console.log("4. Sell-Bad Alert (Red) - Price dropped below sell target (bad for selling)");
  console.log("5. Run All Tests");
  console.log("0. Exit\n");

  const choice = await askQuestion("Select test case (0-5): ");
  return choice.trim();
}

// Test alert with a sample skin
async function testAlert(alertType, webhookUrl) {
  const testSkinName = "★ Kukri Knife | Case Hardened (Field-Tested)";

  // Calculate realistic prices and thresholds for each alert type
  // Using more distinct prices to make differences clear
  let testPrice, testThreshold, prevPrice, title, message, interest;

  switch (alertType) {
    case "buy":
      // Buy alert: price dropped BELOW buy target (good for buying)
      // Scenario: You want to buy when price ≤ 1900, and it dropped to 1700
      testThreshold = 1900; // Buy target: 1900
      testPrice = 1700; // Current price: 1700 (below target - GOOD!)
      prevPrice = 1850; // Previous price: 1850
      title = `${testSkinName} dropped below ${testThreshold}`;
      message = `Price: ${testPrice} (was ${prevPrice})`;
      interest = "buy";
      break;
    case "sell":
      // Sell alert: price rose ABOVE sell target (good for selling)
      // Scenario: You want to sell when price ≥ 1900, and it rose to 2100
      testThreshold = 1900; // Sell target: 1900
      testPrice = 2100; // Current price: 2100 (above target - GOOD!)
      prevPrice = 1950; // Previous price: 1950
      title = `${testSkinName} rose above ${testThreshold}`;
      message = `Price: ${testPrice} (was ${prevPrice})`;
      interest = "sell";
      break;
    case "buy-bad":
      // Buy-bad alert: price rose ABOVE buy target (bad for buying)
      // Scenario: You want to buy when price ≤ 1900, but it rose to 2100 (BAD!)
      testThreshold = 1900; // Buy target: 1900
      testPrice = 2100; // Current price: 2100 (above target - BAD for buying!)
      prevPrice = 1950; // Previous price: 1950
      title = `${testSkinName} rose above ${testThreshold}`;
      message = `Price: ${testPrice} (was ${prevPrice}) - Price moving away from buy target`;
      interest = "buy";
      break;
    case "sell-bad":
      // Sell-bad alert: price dropped BELOW sell target (bad for selling)
      // Scenario: You want to sell when price ≥ 1900, but it dropped to 1700 (BAD!)
      testThreshold = 1900; // Sell target: 1900
      testPrice = 1700; // Current price: 1700 (below target - BAD for selling!)
      prevPrice = 1850; // Previous price: 1850
      title = `${testSkinName} dropped below ${testThreshold}`;
      message = `Price: ${testPrice} (was ${prevPrice}) - Price moving away from sell target`;
      interest = "sell";
      break;
    default:
      throw new Error(`Unknown alert type: ${alertType}`);
  }

  // Optionally fetch image URL for the skin
  let imageUrl = null;
  try {
    imageUrl = await getSkinImageUrl(testSkinName);
    if (imageUrl) {
      console.log(`Found image URL: ${imageUrl}`);
    }
  } catch (err) {
    console.log("Could not fetch image URL (this is optional):", err.message);
  }

  console.log(`\n=== Sending ${alertType.toUpperCase()} Alert ===`);
  console.log(`Title: ${title}`);
  console.log(`Message: ${message}`);
  console.log(`Current Price: ₹${testPrice.toLocaleString()}`);
  console.log(`Target: ₹${testThreshold.toLocaleString()}`);
  console.log(
    `Price vs Target: ${testPrice} ${testPrice <= testThreshold ? "≤" : "≥"} ${testThreshold}`
  );
  console.log(
    `Status: ${alertType === "buy" || alertType === "sell" ? "✅ Good opportunity" : "❌ Bad movement"}`
  );
  console.log(`Interest: ${interest}`);
  console.log(`Alert Type: ${alertType}`);

  // Test with full parameters including alert type, prices, interest, and image
  await sendAlert(
    title,
    message,
    testSkinName,
    alertType,
    webhookUrl || process.env.DISCORD_WEBHOOK_URL,
    testPrice,
    testThreshold,
    interest,
    imageUrl
  );

  console.log(`\n✓ ${alertType} alert sent! Check your Discord channel.`);
}

// Main function
async function main() {
  console.log("Discord Alert Tester");
  console.log("Make sure DISCORD_WEBHOOK_URL is set in your .env file");

  let webhookUrl = process.env.DISCORD_WEBHOOK_URL;
  if (!webhookUrl) {
    console.warn("\n⚠ Warning: DISCORD_WEBHOOK_URL not found in .env");
    const useCustom = await askQuestion("Do you want to use a custom webhook URL? (y/n): ");
    if (useCustom.toLowerCase() === "y") {
      const customUrl = await askQuestion("Enter webhook URL: ");
      if (customUrl.trim()) {
        webhookUrl = customUrl.trim();
      }
    }
  }

  while (true) {
    const choice = await showMenu();

    if (choice === "0") {
      console.log("\nExiting...");
      break;
    }

    try {
      switch (choice) {
        case "1":
          await testAlert("buy", webhookUrl);
          break;
        case "2":
          await testAlert("sell", webhookUrl);
          break;
        case "3":
          await testAlert("buy-bad", webhookUrl);
          break;
        case "4":
          await testAlert("sell-bad", webhookUrl);
          break;
        case "5":
          console.log("\n=== Running All Tests ===\n");
          await testAlert("buy", webhookUrl);
          await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds between tests
          await testAlert("sell", webhookUrl);
          await new Promise(resolve => setTimeout(resolve, 2000));
          await testAlert("buy-bad", webhookUrl);
          await new Promise(resolve => setTimeout(resolve, 2000));
          await testAlert("sell-bad", webhookUrl);
          console.log("\n✓ All tests completed!");
          break;
        default:
          console.log("\n❌ Invalid choice. Please select 0-5.");
      }
    } catch (err) {
      console.error("\n❌ Error:", err.message);
    }

    if (choice !== "5") {
      const continueChoice = await askQuestion("\nPress Enter to continue...");
    }
  }

  rl.close();
}

main().catch(err => {
  console.error("Fatal error:", err);
  rl.close();
  process.exit(1);
});
