import cron from "node-cron";
import Tracker from "../models/tracker.js";
import User from "../models/user.js";
import { getSkinPrice } from "../steam/steam.js";
import { sendAlert } from "../alert/alert.js";

// Retry logic for Discord webhook calls
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
      return; // Success
    } catch (err) {
      if (attempt === maxRetries) {
        console.error(
          `Failed to send alert after ${maxRetries} attempts for ${skinName} to user webhook`
        );
        throw err;
      }
      // Wait before retry (exponential backoff)
      await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
    }
  }
}

export default function startCron() {
  const intervalMin = Number(process.env.CHECK_INTERVAL_MINUTES || 5);
  // run every `intervalMin` minutes
  const cronExpr = `*/${Math.max(1, intervalMin)} * * * *`;

  cron.schedule(cronExpr, async () => {
    console.log(new Date().toISOString(), "Running price check...");

    // Get all users with their webhooks
    const users = await User.find({});

    // Process trackers for each user
    for (const user of users) {
      const trackers = await Tracker.find({ userId: user.userId });

      if (trackers.length === 0) {
        continue; // Skip users with no trackers
      }

      console.log(`Processing ${trackers.length} trackers for user ${user.userId}`);

      for (let i = 0; i < trackers.length; i++) {
        const item = trackers[i];
        try {
          const prevPrice = item.lastKnownPrice != null ? item.lastKnownPrice : null;

          // Rate limiting is now handled in steam.js with built-in retry logic
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
                if (
                  !item.downAlertSent ||
                  item.lastDownAlertPrice == null ||
                  price < item.lastDownAlertPrice
                ) {
                  const title =
                    prevPrice == null
                      ? `${item.skinName} is below ${item.targetDown}`
                      : `${item.skinName} dropped below ${item.targetDown}`;
                  const message =
                    prevPrice == null
                      ? `Current price: ${price}`
                      : `Price: ${price} (was ${prevPrice})`;

                  try {
                    await sendAlertWithRetry(
                      title,
                      message,
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
                  } catch (err) {
                    console.error(
                      `Failed to send buy alert for ${item.skinName} to user ${user.userId}`
                    );
                  }
                }
              }

              // Price rose above targetDown (was below) - bad for buying (red up arrow)
              if (prevPrice != null && prevPrice <= item.targetDown && price > item.targetDown) {
                try {
                  await sendAlertWithRetry(
                    `${item.skinName} rose above ${item.targetDown}`,
                    `Price: ${price} (was ${prevPrice}) - Price moving away from buy target`,
                    item.skinName,
                    "buy-bad",
                    user.discordWebhook,
                    price,
                    item.targetDown,
                    interest,
                    item.imageUrl
                  );
                } catch (err) {
                  console.error(
                    `Failed to send buy-bad alert for ${item.skinName} to user ${user.userId}`
                  );
                }
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
                if (
                  !item.upAlertSent ||
                  item.lastUpAlertPrice == null ||
                  price > item.lastUpAlertPrice
                ) {
                  const title =
                    prevPrice == null
                      ? `${item.skinName} is above ${item.targetUp}`
                      : `${item.skinName} rose above ${item.targetUp}`;
                  const message =
                    prevPrice == null
                      ? `Current price: ${price}`
                      : `Price: ${price} (was ${prevPrice})`;

                  try {
                    await sendAlertWithRetry(
                      title,
                      message,
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
                  } catch (err) {
                    console.error(
                      `Failed to send sell alert for ${item.skinName} to user ${user.userId}`
                    );
                  }
                }
              }

              // Price dropped below targetUp (was above) - bad for selling (red down arrow)
              if (prevPrice != null && prevPrice >= item.targetUp && price < item.targetUp) {
                try {
                  await sendAlertWithRetry(
                    `${item.skinName} dropped below ${item.targetUp}`,
                    `Price: ${price} (was ${prevPrice}) - Price moving away from sell target`,
                    item.skinName,
                    "sell-bad",
                    user.discordWebhook,
                    price,
                    item.targetUp,
                    interest,
                    item.imageUrl
                  );
                } catch (err) {
                  console.error(
                    `Failed to send sell-bad alert for ${item.skinName} to user ${user.userId}`
                  );
                }
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
          // Errors are already logged in steam.js with detailed retry information
          // Just log a summary here
          const errorMessage = err.message || err;
          console.error(`Failed to process tracker for "${item.skinName}": ${errorMessage}`);
          // Continue processing other trackers even if one fails
        }
      }
    }

    console.log(new Date().toISOString(), "Price check finished.");
  });
}
