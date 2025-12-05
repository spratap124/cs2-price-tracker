import dotenv from "dotenv";
import axios from "axios";
import {
  getSkinPrice
} from "./src/steam/steam.js";

dotenv.config();

const BASE_URL = process.env.BASE_URL || "http://localhost:3001";
const minPrice = 5000; // Minimum price to search for
const maxPrice = 20000; // Maximum price to search for

// Target price calculation: set targets as percentage of current price
// targetDown: alert when price drops X% below current (buy opportunity)
// targetUp: alert when price rises X% above current (sell opportunity)
const TARGET_DOWN_PERCENT = 10; // 10% below current price
const TARGET_UP_PERCENT = 10; // 10% above current price

// Comprehensive list of knife skins to test
const knifeSkinsToTest = [
  // Navaja Knife variations
  "★ Navaja Knife | Night (Field-Tested)",
  "★ Navaja Knife | Night (Well-Worn)",
  "★ Navaja Knife | Night (Battle-Scarred)",
  "★ Navaja Knife | Forest DDPAT (Field-Tested)",
  "★ Navaja Knife | Forest DDPAT (Well-Worn)",
  "★ Navaja Knife | Forest DDPAT (Battle-Scarred)",
  "★ Navaja Knife | Crimson Web (Field-Tested)",
  "★ Navaja Knife | Crimson Web (Well-Worn)",
  "★ Navaja Knife | Crimson Web (Battle-Scarred)",
  "★ Navaja Knife | Boreal Forest (Field-Tested)",
  "★ Navaja Knife | Boreal Forest (Well-Worn)",
  "★ Navaja Knife | Boreal Forest (Battle-Scarred)",
  "★ Navaja Knife | Safari Mesh (Field-Tested)",
  "★ Navaja Knife | Safari Mesh (Well-Worn)",
  "★ Navaja Knife | Safari Mesh (Battle-Scarred)",
  "★ Navaja Knife | Scorched (Field-Tested)",
  "★ Navaja Knife | Scorched (Well-Worn)",
  "★ Navaja Knife | Scorched (Battle-Scarred)",

  // Gut Knife variations
  "★ Gut Knife | Night (Field-Tested)",
  "★ Gut Knife | Night (Well-Worn)",
  "★ Gut Knife | Night (Battle-Scarred)",
  "★ Gut Knife | Forest DDPAT (Field-Tested)",
  "★ Gut Knife | Forest DDPAT (Well-Worn)",
  "★ Gut Knife | Forest DDPAT (Battle-Scarred)",
  "★ Gut Knife | Boreal Forest (Field-Tested)",
  "★ Gut Knife | Boreal Forest (Well-Worn)",
  "★ Gut Knife | Boreal Forest (Battle-Scarred)",
  "★ Gut Knife | Safari Mesh (Field-Tested)",
  "★ Gut Knife | Safari Mesh (Well-Worn)",
  "★ Gut Knife | Safari Mesh (Battle-Scarred)",
  "★ Gut Knife | Scorched (Field-Tested)",
  "★ Gut Knife | Scorched (Well-Worn)",
  "★ Gut Knife | Scorched (Battle-Scarred)",
  "★ Gut Knife | Urban Masked (Field-Tested)",
  "★ Gut Knife | Urban Masked (Well-Worn)",
  "★ Gut Knife | Urban Masked (Battle-Scarred)",

  // Falchion Knife variations
  "★ Falchion Knife | Night (Field-Tested)",
  "★ Falchion Knife | Night (Well-Worn)",
  "★ Falchion Knife | Night (Battle-Scarred)",
  "★ Falchion Knife | Forest DDPAT (Field-Tested)",
  "★ Falchion Knife | Forest DDPAT (Well-Worn)",
  "★ Falchion Knife | Forest DDPAT (Battle-Scarred)",
  "★ Falchion Knife | Boreal Forest (Field-Tested)",
  "★ Falchion Knife | Boreal Forest (Well-Worn)",
  "★ Falchion Knife | Boreal Forest (Battle-Scarred)",
  "★ Falchion Knife | Safari Mesh (Field-Tested)",
  "★ Falchion Knife | Safari Mesh (Well-Worn)",
  "★ Falchion Knife | Safari Mesh (Battle-Scarred)",
  "★ Falchion Knife | Scorched (Field-Tested)",
  "★ Falchion Knife | Scorched (Well-Worn)",
  "★ Falchion Knife | Scorched (Battle-Scarred)",

  // Shadow Daggers variations
  "★ Shadow Daggers | Night (Field-Tested)",
  "★ Shadow Daggers | Night (Well-Worn)",
  "★ Shadow Daggers | Night (Battle-Scarred)",
  "★ Shadow Daggers | Forest DDPAT (Field-Tested)",
  "★ Shadow Daggers | Forest DDPAT (Well-Worn)",
  "★ Shadow Daggers | Forest DDPAT (Battle-Scarred)",
  "★ Shadow Daggers | Boreal Forest (Field-Tested)",
  "★ Shadow Daggers | Boreal Forest (Well-Worn)",
  "★ Shadow Daggers | Boreal Forest (Battle-Scarred)",
  "★ Shadow Daggers | Safari Mesh (Field-Tested)",
  "★ Shadow Daggers | Safari Mesh (Well-Worn)",
  "★ Shadow Daggers | Safari Mesh (Battle-Scarred)",
  "★ Shadow Daggers | Scorched (Field-Tested)",
  "★ Shadow Daggers | Scorched (Well-Worn)",
  "★ Shadow Daggers | Scorched (Battle-Scarred)",

  // Survival Knife variations
  "★ Survival Knife | Night Stripe (Field-Tested)",
  "★ Survival Knife | Night Stripe (Well-Worn)",
  "★ Survival Knife | Night Stripe (Battle-Scarred)",
  "★ Survival Knife | Forest DDPAT (Field-Tested)",
  "★ Survival Knife | Forest DDPAT (Well-Worn)",
  "★ Survival Knife | Forest DDPAT (Battle-Scarred)",
  "★ Survival Knife | Boreal Forest (Field-Tested)",
  "★ Survival Knife | Boreal Forest (Well-Worn)",
  "★ Survival Knife | Boreal Forest (Battle-Scarred)",
  "★ Survival Knife | Safari Mesh (Field-Tested)",
  "★ Survival Knife | Safari Mesh (Well-Worn)",
  "★ Survival Knife | Safari Mesh (Battle-Scarred)",

  // Stiletto Knife variations
  "★ Stiletto Knife | Night (Field-Tested)",
  "★ Stiletto Knife | Night (Well-Worn)",
  "★ Stiletto Knife | Night (Battle-Scarred)",
  "★ Stiletto Knife | Forest DDPAT (Field-Tested)",
  "★ Stiletto Knife | Forest DDPAT (Well-Worn)",
  "★ Stiletto Knife | Forest DDPAT (Battle-Scarred)",
  "★ Stiletto Knife | Boreal Forest (Field-Tested)",
  "★ Stiletto Knife | Boreal Forest (Well-Worn)",
  "★ Stiletto Knife | Boreal Forest (Battle-Scarred)",
  "★ Stiletto Knife | Safari Mesh (Field-Tested)",
  "★ Stiletto Knife | Safari Mesh (Well-Worn)",
  "★ Stiletto Knife | Safari Mesh (Battle-Scarred)",
  "★ Stiletto Knife | Scorched (Field-Tested)",
  "★ Stiletto Knife | Scorched (Well-Worn)",
  "★ Stiletto Knife | Scorched (Battle-Scarred)",

  // Huntsman Knife variations (might be in range)
  "★ Huntsman Knife | Night (Field-Tested)",
  "★ Huntsman Knife | Night (Well-Worn)",
  "★ Huntsman Knife | Night (Battle-Scarred)",
  "★ Huntsman Knife | Forest DDPAT (Field-Tested)",
  "★ Huntsman Knife | Forest DDPAT (Well-Worn)",
  "★ Huntsman Knife | Forest DDPAT (Battle-Scarred)",
  "★ Huntsman Knife | Boreal Forest (Field-Tested)",
  "★ Huntsman Knife | Boreal Forest (Well-Worn)",
  "★ Huntsman Knife | Boreal Forest (Battle-Scarred)",
  "★ Huntsman Knife | Safari Mesh (Field-Tested)",
  "★ Huntsman Knife | Safari Mesh (Well-Worn)",
  "★ Huntsman Knife | Safari Mesh (Battle-Scarred)",
  "★ Huntsman Knife | Scorched (Field-Tested)",
  "★ Huntsman Knife | Scorched (Well-Worn)",
  "★ Huntsman Knife | Scorched (Battle-Scarred)",

  // Bowie Knife variations
  "★ Bowie Knife | Night (Field-Tested)",
  "★ Bowie Knife | Night (Well-Worn)",
  "★ Bowie Knife | Night (Battle-Scarred)",
  "★ Bowie Knife | Forest DDPAT (Field-Tested)",
  "★ Bowie Knife | Forest DDPAT (Well-Worn)",
  "★ Bowie Knife | Forest DDPAT (Battle-Scarred)",
  "★ Bowie Knife | Boreal Forest (Field-Tested)",
  "★ Bowie Knife | Boreal Forest (Well-Worn)",
  "★ Bowie Knife | Boreal Forest (Battle-Scarred)",
  "★ Bowie Knife | Safari Mesh (Field-Tested)",
  "★ Bowie Knife | Safari Mesh (Well-Worn)",
  "★ Bowie Knife | Safari Mesh (Battle-Scarred)",
  "★ Bowie Knife | Scorched (Field-Tested)",
  "★ Bowie Knife | Scorched (Well-Worn)",
  "★ Bowie Knife | Scorched (Battle-Scarred)",
];

async function createTracker(skinName, targetDown, targetUp) {
  try {
    const response = await axios.post(`${BASE_URL}/track`, {
      skinName,
      targetDown,
      targetUp,
    });
    return response.data;
  } catch (error) {
    // Handle case where tracker already exists (avoid optional chaining to prevent formatter issues)
    if (error.response && error.response.status === 400) {
      const errorMessage = error.response.data && error.response.data.error;
      if (errorMessage && errorMessage.includes("already exists")) {
        return {
          exists: true
        };
      }
    }
    return null;
  }
}

async function getExistingTrackers() {
  try {
    const response = await axios.get(`${BASE_URL}/track`);
    return response.data.map(t => t.skinName);
  } catch (error) {
    console.error("Failed to fetch existing trackers:", error.message);
    return [];
  }
}

async function findAndTrackKnives() {
  console.log(`Finding and tracking knives in ₹${minPrice}-₹${maxPrice} range...\n`);

  // Get list of already tracked skins
  console.log("Checking existing trackers...");
  const existingTrackers = await getExistingTrackers();
  console.log(`Found ${existingTrackers.length} existing trackers. Skipping those...\n`);

  // Filter out already tracked knives
  const knivesToTest = knifeSkinsToTest.filter(skinName => !existingTrackers.includes(skinName));
  console.log(`Testing ${knivesToTest.length} knife variations (${knifeSkinsToTest.length - knivesToTest.length} already tracked)...\n`);

  const validKnives = [];
  let rateLimited = false;

  for (let i = 0; i < knivesToTest.length; i++) {
    const skinName = knivesToTest[i];

    if (rateLimited) {
      console.log(`\n⚠️  Rate limited. Waiting 120 seconds before continuing...`);
      await new Promise(resolve => setTimeout(resolve, 120000));
      rateLimited = false;
    }

    try {
      const price = await getSkinPrice(skinName);

      if (price !== null && price >= minPrice && price <= maxPrice) {
        // Calculate targets based on current price
        const targetDown = Math.round(price * (1 - TARGET_DOWN_PERCENT / 100));
        const targetUp = Math.round(price * (1 + TARGET_UP_PERCENT / 100));

        validKnives.push({
          skinName,
          price,
          targetDown,
          targetUp
        });
        console.log(`✓ ${skinName}: ₹${price.toFixed(2)}`);
        console.log(`  Targets: Down ₹${targetDown} (${TARGET_DOWN_PERCENT}% below), Up ₹${targetUp} (${TARGET_UP_PERCENT}% above)`);
        console.log(`  Creating tracker...`);

        const result = await createTracker(skinName, targetDown, targetUp);
        if (result && !result.exists) {
          console.log(`  ✓ Tracker created`);
        } else if (result && result.exists) {
          console.log(`  ⚠ Tracker already exists`);
        } else {
          console.log(`  ✗ Failed to create tracker`);
        }
      } else if (price !== null) {
        console.log(`  ${skinName}: ₹${price.toFixed(2)} (outside range)`);
      } else {
        console.log(`  ${skinName}: No price found`);
      }
    } catch (error) {
      if (error.response && error.response.status === 429) {
        console.log(`  ${skinName}: Rate limited (429)`);
        rateLimited = true;
        i--; // Retry this one
        continue;
      } else {
        console.log(`  ${skinName}: Error - ${error.message}`);
      }
    }

    // Delay between requests to avoid rate limiting (30 seconds minimum)
    await new Promise(resolve => setTimeout(resolve, 30000));

    // Progress update every 10 items
    if ((i + 1) % 10 === 0) {
      console.log(`\nProgress: ${i + 1}/${knivesToTest.length} tested, ${validKnives.length} valid found\n`);
    }
  }

  console.log(`\n\n✅ Summary:`);
  console.log(`Found ${validKnives.length} knives in ₹${minPrice}-₹${maxPrice} range:`);
  validKnives.forEach(knife => {
    console.log(`  - ${knife.skinName}:`);
    console.log(`    Current: ₹${knife.price.toFixed(2)}`);
    console.log(`    Target Down: ₹${knife.targetDown} (alert when price drops)`);
    console.log(`    Target Up: ₹${knife.targetUp} (alert when price rises)`);
  });
  console.log(`\nAll valid knives have been added to tracking!`);
  console.log(`Targets are set at ±${TARGET_UP_PERCENT}% of current price.`);
  console.log(`Check your trackers at: ${BASE_URL}/track`);
}

findAndTrackKnives().catch(console.error);