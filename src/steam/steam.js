import axios from "axios";

const APP_ID = 730;
const APPID = 730; // CS:GO / CS2 appid on Steam
const CURRENCY = process.env.CURRENCY || "24"; // default INR
const USER_AGENT = process.env.USER_AGENT || "PriceTracker/1.0";

// Price cache to reduce redundant API calls
// Format: { marketHashName: { price: number, timestamp: number } }
const priceCache = new Map();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes cache

// Rate limiting state
let lastRequestTime = 0;
// Minimum time between requests (Steam is strict - default 10 seconds, configurable via env)
// Increased from 5s to 10s for better reliability
const MIN_REQUEST_INTERVAL_MS = Number(process.env.STEAM_API_MIN_INTERVAL_MS || 10000);

// Cooldown period after a 429 error (increases with each 429)
let cooldownUntil = 0;
let consecutive429Count = 0;

/**
 * Wait until enough time has passed since the last request
 * Also respects cooldown period after 429 errors
 */
async function waitForRateLimit() {
  const now = Date.now();

  // First, check if we're in a cooldown period (after 429 errors)
  if (now < cooldownUntil) {
    const cooldownWait = cooldownUntil - now;
    if (process.env.DEBUG_STEAM === "true") {
      console.log(`[Steam API] In cooldown period, waiting ${cooldownWait / 1000}s...`);
    }
    await new Promise(resolve => setTimeout(resolve, cooldownWait));
  }

  // Then check minimum interval between requests
  const timeSinceLastRequest = now - lastRequestTime;

  if (timeSinceLastRequest < MIN_REQUEST_INTERVAL_MS) {
    const waitTime = MIN_REQUEST_INTERVAL_MS - timeSinceLastRequest;
    if (process.env.DEBUG_STEAM === "true") {
      console.log(`[Steam API] Rate limiting: waiting ${waitTime / 1000}s...`);
    }
    await new Promise(resolve => setTimeout(resolve, waitTime));
  }

  lastRequestTime = Date.now();
}

/**
 * Handle 429 rate limit error - set cooldown period
 */
function handle429Error() {
  consecutive429Count++;

  // Exponential cooldown: 30s, 60s, 120s, etc.
  const cooldownDuration = Math.min(
    Math.pow(2, consecutive429Count - 1) * 30000, // 30s, 60s, 120s, 240s...
    300000 // Max 5 minutes
  );

  cooldownUntil = Date.now() + cooldownDuration;

  console.warn(
    `[Steam API] 429 error detected (count: ${consecutive429Count}). ` +
      `Entering cooldown for ${cooldownDuration / 1000}s...`
  );
}

/**
 * Reset cooldown on successful request
 */
function resetCooldown() {
  if (consecutive429Count > 0) {
    consecutive429Count = 0;
    cooldownUntil = 0;
    if (process.env.DEBUG_STEAM === "true") {
      console.log(`[Steam API] Cooldown reset after successful request`);
    }
  }
}

/**
 * Clear the price cache (useful for testing or forcing fresh data)
 */
export function clearPriceCache() {
  priceCache.clear();
}

// Returns image URL for a skin, or null if not available
export async function getSkinImageUrl(marketHashName) {
  try {
    const url = `https://steamcommunity.com/market/listings/${APPID}/${encodeURIComponent(marketHashName)}`;

    const res = await axios.get(url, {
      headers: {
        "User-Agent": USER_AGENT
      }
    });

    // Extract image URL from the page HTML
    // The image is typically in a meta tag or in the market_listing_largeimage class
    const html = res.data;

    // Try to find the image URL in various possible locations
    // Pattern 1: market_listing_largeimage src
    let match = html.match(/market_listing_largeimage["\s]*src=["']([^"']+)["']/i);
    if (match) {
      return match[1];
    }

    // Pattern 2: meta property="og:image"
    match = html.match(/<meta\s+property=["']og:image["']\s+content=["']([^"']+)["']/i);
    if (match) {
      return match[1];
    }

    // Pattern 3: class="market_listing_largeimage" with src
    match = html.match(/class=["']market_listing_largeimage["'][^>]*src=["']([^"']+)["']/i);
    if (match) {
      return match[1];
    }

    return null;
  } catch (err) {
    if (process.env.DEBUG_STEAM === "true") {
      console.error(`[Steam API] Error fetching image for "${marketHashName}":`, err.message);
    }
    return null;
  }
}

function parseSteamPrice(priceStr) {
  if (!priceStr || typeof priceStr !== "string") return null;

  // Remove currency symbol, spaces, NBSP, commas
  const normalized = priceStr.replace(/[₹,\s\u00A0]/g, "").trim();

  const value = Number(normalized);
  return Number.isFinite(value) && value > 0 ? value : null;
}

export async function getSkinPrice(skinName) {
  try {
    const marketHashName = encodeURIComponent(skinName);

    const url = `https://steamcommunity.com/market/priceoverview/?appid=730&currency=24&market_hash_name=${marketHashName}`;

    const res = await axios.get(url, {
      timeout: 10000,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36",
        Accept: "application/json,text/plain,*/*",
        "Accept-Language": "en-IN,en;q=0.9",
        Referer: "https://steamcommunity.com/market/",
        Cookie: "steamCountry=IN|INR"
      }
    });

    if (!res.data?.success) return null;

    const priceStr = res.data.lowest_price || res.data.median_price || null;

    return parseSteamPrice(priceStr);
  } catch (err) {
    if (err.response?.status === 429) {
      console.warn(`[${new Date().toISOString()}] ⚠ Steam 429 for ${skinName}`);
    } else {
      console.error(`[${new Date().toISOString()}] Steam error for ${skinName}:`, err.message);
    }

    return null;
  }
}
