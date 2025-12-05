import cron from "node-cron";
import Tracker from "../models/tracker.js";
import {
  getSkinPrice
} from "../steam/steam.js";
import {
  sendAlert
} from "../alert/alert.js";

export default function startCron() {
  const intervalMin = Number(process.env.CHECK_INTERVAL_MINUTES || 5);
  // run every `intervalMin` minutes
  const cronExpr = `*/${Math.max(1, intervalMin)} * * * *`;

  cron.schedule(cronExpr, async () => {
    console.log(new Date().toISOString(), "Running price check...");

    const trackers = await Tracker.find();
    const delayMs = Number(process.env.STEAM_API_DELAY_MS || 2000); // Default 2 seconds between requests

    for (let i = 0; i < trackers.length; i++) {
      const item = trackers[i];
      try {
        const prevPrice = item.lastKnownPrice != null ? item.lastKnownPrice : null;

        // Add delay before API call (except for first item)
        if (i > 0) {
          await new Promise(resolve => setTimeout(resolve, delayMs));
        }

        const price = await getSkinPrice(item.skinName);
        if (price === null) {
          console.log(`No price found for ${item.skinName}`);
          continue;
        }

        // update last known price
        item.lastKnownPrice = price;

        // Crossing DOWN: prevPrice > targetDown && price <= targetDown
        if (
          item.targetDown != null &&
          prevPrice != null &&
          prevPrice > item.targetDown &&
          price <= item.targetDown
        ) {
          if (!item.downAlertSent || item.lastDownAlertPrice == null || price < item.lastDownAlertPrice) {
            await sendAlert(
              `${item.skinName} dropped below ${item.targetDown}`,
              `Price: ${price} (was ${prevPrice})`,
              item.skinName
            );
            item.downAlertSent = true;
            item.lastDownAlertPrice = price;
          }
        }

        // Initial state check for DOWN: if price is already below targetDown on first check
        if (
          item.targetDown != null &&
          prevPrice == null &&
          price <= item.targetDown
        ) {
          if (!item.downAlertSent || item.lastDownAlertPrice == null || price < item.lastDownAlertPrice) {
            await sendAlert(
              `${item.skinName} is below ${item.targetDown}`,
              `Current price: ${price}`,
              item.skinName
            );
            item.downAlertSent = true;
            item.lastDownAlertPrice = price;
          }
        }

        // Crossing UP: prevPrice < targetUp && price >= targetUp
        if (
          item.targetUp != null &&
          prevPrice != null &&
          prevPrice < item.targetUp &&
          price >= item.targetUp
        ) {
          if (!item.upAlertSent || item.lastUpAlertPrice == null || price > item.lastUpAlertPrice) {
            await sendAlert(
              `${item.skinName} rose above ${item.targetUp}`,
              `Price: ${price} (was ${prevPrice})`,
              item.skinName
            );
            item.upAlertSent = true;
            item.lastUpAlertPrice = price;
          }
        }

        // Initial state check for UP: if price is already above targetUp on first check
        if (
          item.targetUp != null &&
          prevPrice == null &&
          price >= item.targetUp
        ) {
          if (!item.upAlertSent || item.lastUpAlertPrice == null || price > item.lastUpAlertPrice) {
            await sendAlert(
              `${item.skinName} is above ${item.targetUp}`,
              `Current price: ${price}`,
              item.skinName
            );
            item.upAlertSent = true;
            item.lastUpAlertPrice = price;
          }
        }

        // Check if price is already beyond threshold (even if no crossing occurred)
        // This handles cases where price was already beyond threshold when tracker was created
        // Also sends alerts if price continues moving further beyond threshold
        if (
          item.targetUp != null &&
          prevPrice != null &&
          price >= item.targetUp &&
          prevPrice >= item.targetUp
        ) {
          // Price is already above targetUp - send alert if first time or if price moved higher
          if (!item.upAlertSent || item.lastUpAlertPrice == null || price > item.lastUpAlertPrice) {
            await sendAlert(
              `${item.skinName} is above ${item.targetUp}`,
              `Current price: ${price} (threshold: ${item.targetUp})`,
              item.skinName
            );
            item.upAlertSent = true;
            item.lastUpAlertPrice = price;
          }
        }

        if (
          item.targetDown != null &&
          prevPrice != null &&
          price <= item.targetDown &&
          prevPrice <= item.targetDown
        ) {
          // Price is already below targetDown - send alert if first time or if price moved lower
          if (!item.downAlertSent || item.lastDownAlertPrice == null || price < item.lastDownAlertPrice) {
            await sendAlert(
              `${item.skinName} is below ${item.targetDown}`,
              `Current price: ${price} (threshold: ${item.targetDown})`,
              item.skinName
            );
            item.downAlertSent = true;
            item.lastDownAlertPrice = price;
          }
        }

        // Auto reset logic: if price moves back inside range clear flags
        if (item.targetDown != null && item.targetUp != null) {
          // if price is between targets, reset both alerts so future crossings are reported
          if (price > item.targetDown && price < item.targetUp) {
            if (item.downAlertSent || item.upAlertSent) {
              item.downAlertSent = false;
              item.upAlertSent = false;
              item.lastDownAlertPrice = null;
              item.lastUpAlertPrice = null;
            }
          }
        } else if (item.targetDown != null) {
          // single targetDown: if price goes above targetDown by some margin reset downAlertSent
          if (price > item.targetDown && item.downAlertSent) {
            item.downAlertSent = false;
            item.lastDownAlertPrice = null;
          }
        } else if (item.targetUp != null) {
          if (price < item.targetUp && item.upAlertSent) {
            item.upAlertSent = false;
            item.lastUpAlertPrice = null;
          }
        }

        await item.save();
      } catch (err) {
        const errorMessage = err.message || err;
        const statusCode = err.response ? err.response.status : null;

        if (statusCode === 429) {
          console.error(`Rate limited (429) for ${item.skinName}. Waiting longer before continuing...`);
          // Wait longer if we hit rate limit
          await new Promise(resolve => setTimeout(resolve, delayMs * 3));
        } else {
          console.error("Error checking tracker", item.skinName, errorMessage);
        }
      }
    }

    console.log(new Date().toISOString(), "Price check finished.");
  });
}