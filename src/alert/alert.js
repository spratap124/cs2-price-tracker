import axios from "axios";

const APPID = 730; // CS2 app ID

// Generate Steam market URL for a skin
function getSteamMarketUrl(skinName) {
  const encodedName = encodeURIComponent(skinName);
  return `https://steamcommunity.com/market/listings/${APPID}/${encodedName}`;
}

// alertType: 'buy' (price drop - good for buying), 'sell' (price rise - good for selling)
//           'buy-bad' (price rise - bad for buying), 'sell-bad' (price drop - bad for selling)
// webhookUrl: Discord webhook URL (optional, falls back to env var for backward compatibility)
export async function sendAlert(
  title,
  message,
  skinName = null,
  alertType = null,
  webhookUrl = null,
  currentPrice = null,
  targetPrice = null,
  interest = null
) {
  const WEBHOOK = webhookUrl || process.env.DISCORD_WEBHOOK_URL;

  // Determine emoji and color based on alert type
  let emoji = "";
  let color = 3066993; // Default Discord blue

  if (alertType === "buy") {
    emoji = "↓"; // Unicode down arrow
    color = 0x00ff00; // Green
  } else if (alertType === "sell") {
    emoji = "↑"; // Unicode up arrow
    color = 0x00ff00; // Green
  } else if (alertType === "buy-bad") {
    emoji = "↑"; // Unicode up arrow
    color = 0xff0000; // Red
  } else if (alertType === "sell-bad") {
    emoji = "↓"; // Unicode down arrow
    color = 0xff0000; // Red
  }

  // Build Discord webhook payload according to spec
  const payload = {
    content: "Price Alert!",
    embeds: [
      {
        title: skinName || title,
        description: "Price has reached your target!",
        fields: [],
        color: color,
        url: skinName ? getSteamMarketUrl(skinName) : undefined
      }
    ]
  };

  // All prices are stored and returned in INR (currency conversion happens in price provider)
  // Always use INR symbol (₹) for all alerts
  const currencySymbol = "₹"; // Always INR since all prices are converted to INR

  // Add fields if we have the data
  if (currentPrice !== null) {
    const formattedPrice =
      typeof currentPrice === "number"
        ? `${currencySymbol}${currentPrice.toLocaleString("en-IN")}`
        : `${currencySymbol}${currentPrice}`;
    payload.embeds[0].fields.push({
      name: "Current Price",
      value: formattedPrice,
      inline: true
    });
  }

  if (targetPrice !== null && alertType) {
    let targetValue = "";
    const formattedTarget =
      typeof targetPrice === "number" ? targetPrice.toLocaleString("en-IN") : targetPrice;

    if (alertType === "buy") {
      targetValue = `≤ ${currencySymbol}${formattedTarget}`;
    } else if (alertType === "sell") {
      targetValue = `≥ ${currencySymbol}${formattedTarget}`;
    }
    if (targetValue) {
      payload.embeds[0].fields.push({
        name: "Target",
        value: targetValue,
        inline: true
      });
    }
  }

  if (interest) {
    payload.embeds[0].fields.push({
      name: "Interest",
      value: interest.charAt(0).toUpperCase() + interest.slice(1),
      inline: true
    });
  }

  // Fallback to simple format if no fields were added
  if (payload.embeds[0].fields.length === 0) {
    payload.embeds[0].description = message;
  }

  if (WEBHOOK) {
    try {
      await axios.post(WEBHOOK, payload);
      console.log("Alert sent successfully to webhook");
    } catch (err) {
      const errorData = err != null && err.response != null ? err.response.data : null;
      console.error("Failed to send webhook", errorData || err.message);
      // Re-throw to allow retry logic in caller
      throw err;
    }
  } else {
    console.log("ALERT", emoji, title, message);
    if (skinName) {
      console.log("Steam link:", getSteamMarketUrl(skinName));
    }
  }
}
