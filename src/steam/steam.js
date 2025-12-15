import axios from "axios";

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
 * Returns numeric price in your currency (number), or null if not available
 * Includes retry logic with exponential backoff for rate limiting
 */
export async function getSkinPrice(marketHashName, useCache = true) {
  // Check cache first
  if (useCache) {
    const cached = priceCache.get(marketHashName);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
      if (process.env.DEBUG_STEAM === "true") {
        console.log(`[Steam API] Using cached price for "${marketHashName}": ${cached.price}`);
      }
      return cached.price;
    }
  }

  const url = `https://steamcommunity.com/market/priceoverview/?appid=${APPID}&currency=${CURRENCY}&market_hash_name=${encodeURIComponent(
    marketHashName
  )}`;

  // Retry logic with exponential backoff
  const maxRetries = 3;
  let lastError = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      // Wait for rate limit before each request
      await waitForRateLimit();

      const res = await axios.get(url, {
        headers: {
          "User-Agent": USER_AGENT,
          Accept: "application/json",
          "Accept-Language": "en-US,en;q=0.9"
        },
        timeout: 10000, // 10 second timeout
        validateStatus: status => status < 500 // Don't throw on 429, handle it manually
      });

      // Handle rate limiting (429)
      if (res.status === 429) {
        // Set cooldown period
        handle429Error();

        // Use retry-after header if available, otherwise use exponential backoff
        const retryAfter = res.headers["retry-after"]
          ? parseInt(res.headers["retry-after"]) * 1000
          : Math.pow(2, attempt) * 10000; // Exponential backoff: 20s, 40s, 80s (more conservative)

        // Ensure we wait at least as long as the cooldown period
        const waitTime = Math.max(retryAfter, cooldownUntil - Date.now());

        if (attempt < maxRetries) {
          console.warn(
            `[Steam API] Rate limited (429) for "${marketHashName}". ` +
              `Attempt ${attempt}/${maxRetries}. Waiting ${Math.ceil(waitTime / 1000)}s before retry...`
          );
          await new Promise(resolve => setTimeout(resolve, waitTime));
          // Update lastRequestTime to account for the wait
          lastRequestTime = Date.now();
          continue; // Retry
        } else {
          throw new Error(`Rate limited after ${maxRetries} attempts`);
        }
      }

      // Handle other errors
      if (res.status !== 200) {
        throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      }

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

      // Cache the result
      if (useCache) {
        priceCache.set(marketHashName, {
          price: value,
          timestamp: Date.now()
        });
      }

      // Success - reset cooldown
      resetCooldown();

      if (process.env.DEBUG_STEAM === "true") {
        console.log(`[Steam API] Parsed value:`, value);
      }

      return value;
    } catch (err) {
      lastError = err;

      // Handle axios errors
      if (err.response) {
        const status = err.response.status;

        if (status === 429) {
          // Set cooldown period
          handle429Error();

          const retryAfter = err.response.headers["retry-after"]
            ? parseInt(err.response.headers["retry-after"]) * 1000
            : Math.pow(2, attempt) * 10000; // More conservative: 20s, 40s, 80s

          // Ensure we wait at least as long as the cooldown period
          const waitTime = Math.max(retryAfter, cooldownUntil - Date.now());

          if (attempt < maxRetries) {
            console.warn(
              `[Steam API] Rate limited (429) for "${marketHashName}". ` +
                `Attempt ${attempt}/${maxRetries}. Waiting ${Math.ceil(waitTime / 1000)}s before retry...`
            );
            await new Promise(resolve => setTimeout(resolve, waitTime));
            // Update lastRequestTime to account for the wait
            lastRequestTime = Date.now();
            continue; // Retry
          }
        } else if (status >= 500 && attempt < maxRetries) {
          // Retry on server errors
          const waitTime = Math.pow(2, attempt) * 2000;
          console.warn(
            `[Steam API] Server error (${status}) for "${marketHashName}". ` +
              `Attempt ${attempt}/${maxRetries}. Waiting ${waitTime / 1000}s before retry...`
          );
          await new Promise(resolve => setTimeout(resolve, waitTime));
          continue;
        }
      }

      // If we're here and it's the last attempt, throw the error
      if (attempt === maxRetries) {
        console.error(
          `[Steam API] Failed to get price for "${marketHashName}" after ${maxRetries} attempts:`,
          err.message
        );
        throw err;
      }
    }
  }

  // Should not reach here, but just in case
  throw lastError || new Error(`Failed to get price for "${marketHashName}"`);
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
