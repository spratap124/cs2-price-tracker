import cron from "node-cron";
import Tracker from "../models/tracker.js";
import User from "../models/user.js";
import { getSkinPrice } from "../steam/steam.js";
import { sendAlert } from "../alert/alert.js";

const REQUEST_DELAY_MS = Number(process.env.STEAM_API_MIN_INTERVAL_MS || 10000);
const sleep = ms => new Promise(res => setTimeout(res, ms));

/* --------------------------------------------------
   Alert retry (UNCHANGED)
-------------------------------------------------- */
async function sendAlertWithRetry(
  title,
  message,
  skinName,
  alertType,
  webhookUrl,
  currentPrice,
  targetPrice,
  interest,
  imageUrl = null,
  maxRetries = 3
) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      await sendAlert(
        title,
        message,
        skinName,
        alertType,
        webhookUrl,
        currentPrice,
        targetPrice,
        interest,
        imageUrl
      );
      return;
    } catch (err) {
      if (attempt === maxRetries) {
        console.error(`Alert failed after ${maxRetries} attempts: ${skinName}`);
        throw err;
      }
      await sleep(1000 * attempt);
    }
  }
}

/* ==================================================
   🔁 MAIN PRICE CHECK LOGIC (EXTRACTED)
================================================== */
async function runPriceCheck() {
  console.log(new Date().toISOString(), "⏳ Price check started");

  const trackers = await Tracker.find({});
  if (trackers.length === 0) {
    console.log("No trackers found");
    return;
  }

  const uniqueSkins = [...new Set(trackers.map(t => t.skinName))];
  console.log(`Fetching prices for ${uniqueSkins.length} unique skins`);

  const priceCache = new Map();

  for (const skinName of uniqueSkins) {
    try {
      console.log(`[${new Date().toISOString()}] Steam request → ${skinName}`);
      const price = await getSkinPrice(skinName);
      priceCache.set(skinName, price);
      console.log(`✔ ${skinName}: ${price}`);
    } catch (err) {
      console.error(`✖ Failed price fetch: ${skinName}`);
      priceCache.set(skinName, null);
    }

    await sleep(REQUEST_DELAY_MS); // HARD delay
  }

  for (const item of trackers) {
    const price = priceCache.get(item.skinName);
    if (price == null) continue;

    const prevPrice = item.lastKnownPrice ?? null;
    item.lastKnownPrice = price;

    item.priceHistory ??= [];
    item.priceHistory.push({ price, timestamp: new Date() });
    if (item.priceHistory.length > 10) {
      item.priceHistory = item.priceHistory.slice(-10);
    }

    const interest = item.interest || "buy";
    const user = await User.findOne({ userId: item.userId });
    if (!user?.discordWebhook) continue;

    if ((interest === "buy" || interest === "both") && item.targetDown != null) {
      if (price <= item.targetDown) {
        if (!item.downAlertSent || price < item.lastDownAlertPrice) {
          await sendAlertWithRetry(
            `${item.skinName} below ${item.targetDown}`,
            `Price: ${price}${prevPrice ? ` (was ${prevPrice})` : ""}`,
            item.skinName,
            "buy",
            user.discordWebhook,
            price,
            item.targetDown,
            interest,
            item.imageUrl
          );
          item.downAlertSent = true;
          item.lastDownAlertPrice = price;
        }
      } else {
        item.downAlertSent = false;
        item.lastDownAlertPrice = null;
      }
    }

    if ((interest === "sell" || interest === "both") && item.targetUp != null) {
      if (price >= item.targetUp) {
        if (!item.upAlertSent || price > item.lastUpAlertPrice) {
          await sendAlertWithRetry(
            `${item.skinName} above ${item.targetUp}`,
            `Price: ${price}${prevPrice ? ` (was ${prevPrice})` : ""}`,
            item.skinName,
            "sell",
            user.discordWebhook,
            price,
            item.targetUp,
            interest,
            item.imageUrl
          );
          item.upAlertSent = true;
          item.lastUpAlertPrice = price;
        }
      } else {
        item.upAlertSent = false;
        item.lastUpAlertPrice = null;
      }
    }

    await item.save();
  }

  console.log(new Date().toISOString(), "✅ Price check finished");
}

/* ==================================================
   🚀 CRON STARTER
================================================== */
export default function startCron() {
  const intervalMin = Math.max(1, Number(process.env.CHECK_INTERVAL_MINUTES || 60));

  let isRunning = false;

  const safeRun = async () => {
    if (isRunning) {
      console.log("⚠ Price check already running, skipping");
      return;
    }
    isRunning = true;
    try {
      await runPriceCheck();
    } catch (err) {
      console.error("Price check failed:", err);
    } finally {
      isRunning = false;
    }
  };

  /* 1️⃣ RUN IMMEDIATELY ON SERVER START */
  safeRun();

  /* 2️⃣ RUN EVERY N MINUTES AFTERWARD */
  const cronExpr = `*/${intervalMin} * * * *`;
  cron.schedule(cronExpr, safeRun);

  console.log(`🕒 Price check scheduled every ${intervalMin} minutes`);
}
