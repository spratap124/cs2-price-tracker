import axios from "axios";

const APPID = 730; // CS:GO / CS2 appid on Steam
const CURRENCY = process.env.CURRENCY || "24"; // default INR
const USER_AGENT = process.env.USER_AGENT || "PriceTracker/1.0";

// Returns numeric price in your currency (number), or null if not available
export async function getSkinPrice(marketHashName) {
  const url = `https://steamcommunity.com/market/priceoverview/?appid=${APPID}&currency=${CURRENCY}&market_hash_name=${encodeURIComponent(
    marketHashName
  )}`;

  const res = await axios.get(url, {
    headers: {
      "User-Agent": USER_AGENT
    }
  });

  if (!res.data || Object.keys(res.data).length === 0) return null;

  // res.data.lowest_price is a string like "₹ 2,500" or "$2.50" or "₹ 2,970.50"
  const priceStr = res.data.lowest_price || res.data.median_price || null;
  if (!priceStr) return null;

  // Debug logging (can be enabled via DEBUG_STEAM env var)
  if (process.env.DEBUG_STEAM === "true") {
    console.log(`[Steam API] Raw price string for "${marketHashName}":`, priceStr);
  }

  // Extract all digits, commas, and dots
  const replaced = priceStr.replace(/[^0-9.,]/g, "");
  const numeric = replaced.trim();
  if (!numeric) return null;

  if (process.env.DEBUG_STEAM === "true") {
    console.log(`[Steam API] Extracted numeric:`, numeric);
  }

  // Handle different price formats:
  // - "2,970" -> 2970 (comma is thousands separator)
  // - "2,970.50" -> 2970.50 (comma thousands, dot decimal)
  // - "29.70" -> 29.70 (dot is decimal, no thousands)
  // - "2970" -> 2970 (no separators)

  let cleaned = numeric;

  // If both comma and dot exist: comma is thousands separator, dot is decimal
  if (cleaned.includes(",") && cleaned.includes(".")) {
    // Remove commas (thousands separators), keep dot (decimal)
    cleaned = cleaned.replace(/,/g, "");
  }
  // If only comma exists: could be thousands separator (e.g., "2,970") or decimal (rare, but possible)
  // For INR, comma is typically thousands separator, so remove it
  else if (cleaned.includes(",")) {
    // Check if it's likely a thousands separator (comma appears before last 3 digits)
    // e.g., "2,970" -> remove comma
    // e.g., "29,70" -> this is unusual, but treat comma as thousands separator
    cleaned = cleaned.replace(/,/g, "");
  }
  // If only dot exists: it's a decimal separator, keep it
  // No action needed, dot stays

  const value = Number(cleaned);
  if (Number.isNaN(value) || value <= 0) return null;

  if (process.env.DEBUG_STEAM === "true") {
    console.log(`[Steam API] Parsed value:`, value);
  }

  return value;
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