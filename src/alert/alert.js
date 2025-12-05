import axios from "axios";

const APPID = 730; // CS2 app ID

// Generate Steam market URL for a skin
function getSteamMarketUrl(skinName) {
  const encodedName = encodeURIComponent(skinName);
  return `https://steamcommunity.com/market/listings/${APPID}/${encodedName}`;
}

// alertType: 'buy' (price drop - good for buying), 'sell' (price rise - good for selling)
//           'buy-bad' (price rise - bad for buying), 'sell-bad' (price drop - bad for selling)
export async function sendAlert(title, message, skinName = null, alertType = null) {
  const WEBHOOK = process.env.DISCORD_WEBHOOK_URL;

  // Determine emoji and color based on alert type
  let emoji = "";
  let color = 0x808080; // Default gray

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

  const payload = {
    embeds: [
      {
        title: `${emoji} ${title}`,
        description: message,
        color: color,
        footer: {
          text: skinName || ""
        }
      }
    ]
  };

  // Add Steam market link if skin name is provided
  if (skinName) {
    const steamUrl = getSteamMarketUrl(skinName);
    payload.embeds[0].url = steamUrl;
    payload.content = `[View on Steam Market](${steamUrl})`;
  }

  if (WEBHOOK) {
    try {
      await axios.post(WEBHOOK, payload);
      console.log("Alert sent successfully");
    } catch (err) {
      const errorData = err != null && err.response != null ? err.response.data : null;
      console.error("Failed to send webhook", errorData || err.message);
    }
  } else {
    console.log("ALERT", emoji, title, message);
    if (skinName) {
      console.log("Steam link:", getSteamMarketUrl(skinName));
    }
  }
}
