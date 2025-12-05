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

        const interest = item.interest || "buy"; // Default to "buy" for backward compatibility

        // Handle BUY interest
        if (interest === "buy" || interest === "both") {
          if (item.targetDown != null) {
            // Price dropped below targetDown - buying opportunity (green down arrow)
            if (
              (prevPrice != null && prevPrice > item.targetDown && price <= item.targetDown) ||
              (prevPrice == null && price <= item.targetDown) ||
              (prevPrice != null && price <= item.targetDown && prevPrice <= item.targetDown)
            ) {
              if (!item.downAlertSent || item.lastDownAlertPrice == null || price < item.lastDownAlertPrice) {
                const title = prevPrice == null ?
                  `${item.skinName} is below ${item.targetDown}` :
                  `${item.skinName} dropped below ${item.targetDown}`;
                const message = prevPrice == null ?
                  `Current price: ${price}` :
                  `Price: ${price} (was ${prevPrice})`;

                await sendAlert(title, message, item.skinName, "buy");
                item.downAlertSent = true;
                item.lastDownAlertPrice = price;
              }
            }

            // Price rose above targetDown (was below) - bad for buying (red up arrow)
            if (
              prevPrice != null &&
              prevPrice <= item.targetDown &&
              price > item.targetDown
            ) {
              await sendAlert(
                `${item.skinName} rose above ${item.targetDown}`,
                `Price: ${price} (was ${prevPrice}) - Price moving away from buy target`,
                item.skinName,
                "buy-bad"
              );
            }
          }
        }

        // Handle SELL interest
        if (interest === "sell" || interest === "both") {
          if (item.targetUp != null) {
            // Price rose above targetUp - selling opportunity (green up arrow)
            if (
              (prevPrice != null && prevPrice < item.targetUp && price >= item.targetUp) ||
              (prevPrice == null && price >= item.targetUp) ||
              (prevPrice != null && price >= item.targetUp && prevPrice >= item.targetUp)
            ) {
              if (!item.upAlertSent || item.lastUpAlertPrice == null || price > item.lastUpAlertPrice) {
                const title = prevPrice == null ?
                  `${item.skinName} is above ${item.targetUp}` :
                  `${item.skinName} rose above ${item.targetUp}`;
                const message = prevPrice == null ?
                  `Current price: ${price}` :
                  `Price: ${price} (was ${prevPrice})`;

                await sendAlert(title, message, item.skinName, "sell");
                item.upAlertSent = true;
                item.lastUpAlertPrice = price;
              }
            }

            // Price dropped below targetUp (was above) - bad for selling (red down arrow)
            if (
              prevPrice != null &&
              prevPrice >= item.targetUp &&
              price < item.targetUp
            ) {
              await sendAlert(
                `${item.skinName} dropped below ${item.targetUp}`,
                `Price: ${price} (was ${prevPrice}) - Price moving away from sell target`,
                item.skinName,
                "sell-bad"
              );
            }
          }
        }

        // Auto reset logic: if price moves back inside range clear flags
        // This allows future alerts to be sent when price crosses thresholds again
        if (interest === "buy" || interest === "both") {
          if (item.targetDown != null && price > item.targetDown && item.downAlertSent) {
            item.downAlertSent = false;
            item.lastDownAlertPrice = null;
          }
        }

        if (interest === "sell" || interest === "both") {
          if (item.targetUp != null && price < item.targetUp && item.upAlertSent) {
            item.upAlertSent = false;
            item.lastUpAlertPrice = null;
          }
        }

        // If both targets exist and price is between them, reset both
        if (item.targetDown != null && item.targetUp != null) {
          if (price > item.targetDown && price < item.targetUp) {
            if (item.downAlertSent || item.upAlertSent) {
              item.downAlertSent = false;
              item.upAlertSent = false;
              item.lastDownAlertPrice = null;
              item.lastUpAlertPrice = null;
            }
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