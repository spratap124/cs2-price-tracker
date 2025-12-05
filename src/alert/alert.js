import axios from "axios";

const APPID = 730; // CS2 app ID

// Generate Steam market URL for a skin
function getSteamMarketUrl(skinName) {
  const encodedName = encodeURIComponent(skinName);
  return `https://steamcommunity.com/market/listings/${APPID}/${encodedName}`;
}

export async function sendAlert(title, message, skinName = null) {
  const WEBHOOK = process.env.DISCORD_WEBHOOK_URL;
  let content = `**${title}**\n${message}`;
  
  // Add Steam market link if skin name is provided
  if (skinName) {
    const steamUrl = getSteamMarketUrl(skinName);
    content += `\n\n[View on Steam Market](${steamUrl})`;
  }

  if (WEBHOOK) {
    try {
      await axios.post(WEBHOOK, {
        content: content
      });
    } catch (err) {
      console.error("Failed to send webhook", err?.response?.data || err.message);
    }
  } else {
    console.log("ALERT", title, message);
    if (skinName) {
      console.log("Steam link:", getSteamMarketUrl(skinName));
    }
  }
}
