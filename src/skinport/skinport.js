import axios from "axios";

const BASE_URL = "https://api.skinport.com/v1/";
const APP_ID = 730; // CS2/CS:GO app ID

// Price cache to reduce redundant API calls
const priceCache = new Map();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes cache (matches Skinport's cache)

// Rate limiting state
let lastRequestTime = 0;
// Skinport allows 8 requests per 5 minutes, so minimum 37.5 seconds between requests
const MIN_REQUEST_INTERVAL_MS = Number(process.env.SKINPORT_API_MIN_INTERVAL_MS || 37500);

/**
 * Wait until enough time has passed since the last request
 */
async function waitForRateLimit() {
  const now = Date.now();
  const timeSinceLastRequest = now - lastRequestTime;

  if (timeSinceLastRequest < MIN_REQUEST_INTERVAL_MS) {
    const waitTime = MIN_REQUEST_INTERVAL_MS - timeSinceLastRequest;
    if (process.env.DEBUG_SKINPORT === "true") {
      console.log(`[Skinport API] Rate limiting: waiting ${waitTime / 1000}s`);
    }
    await new Promise(resolve => setTimeout(resolve, waitTime));
  }

  lastRequestTime = Date.now();
}

/**
 * Convert market hash name to Skinport format if needed
 * Skinport typically uses the same format as Steam Market
 */
function normalizeMarketHashName(marketHashName) {
  return marketHashName.trim();
}

/**
 * Get Skinport authentication credentials from environment
 * Uses Basic Authentication with Client ID and Client Secret
 * Reference: https://docs.skinport.com/introduction/authentication
 */
function getAuthHeader() {
  const clientId = process.env.SKINPORT_CLIENT_ID;
  const clientSecret = process.env.SKINPORT_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error(
      "SKINPORT_CLIENT_ID and SKINPORT_CLIENT_SECRET environment variables are required. " +
        "Get your credentials from: https://skinport.com (Settings → API)"
    );
  }

  // Combine Client ID and Client Secret with a colon and Base64 encode
  const credentials = `${clientId}:${clientSecret}`;
  const encodedCredentials = Buffer.from(credentials).toString("base64");

  return `Basic ${encodedCredentials}`;
}

/**
 * Convert currency code to Skinport currency format
 * Steam uses numeric codes (24 = INR, 1 = USD)
 * Skinport uses string codes (EUR, USD, etc.)
 *
 * Note: Skinport only supports: AUD, BRL, CAD, CHF, CNY, CZK, DKK, EUR, GBP, HRK, NOK, PLN, RUB, SEK, TRY, USD
 * INR and many other currencies are NOT supported by Skinport API
 * Reference: https://docs.skinport.com/items
 */
function convertCurrencyCode(currencyCode) {
  // Map of Steam currency codes to Skinport-supported currencies only
  const currencyMap = {
    1: "USD", // United States Dollar ✅
    2: "GBP", // British Pound Sterling ✅
    3: "EUR", // Euro ✅
    4: "CHF", // Swiss Franc ✅
    5: "RUB", // Russian Ruble ✅
    6: "PLN", // Polish Zloty ✅
    7: "BRL", // Brazilian Real ✅
    9: "SEK", // Swedish Krona ✅
    17: "TRY", // Turkish Lira ✅
    20: "CAD", // Canadian Dollar ✅
    21: "AUD", // Australian Dollar ✅
    23: "CNY" // Chinese Yuan ✅
    // Note: INR (24) is NOT supported by Skinport - will fallback to USD
    // Other unsupported currencies will also fallback to USD
  };

  const mappedCurrency = currencyMap[String(currencyCode)];

  if (mappedCurrency) {
    return mappedCurrency;
  }

  // For unsupported currencies (including INR), fallback to USD
  // User can override this via SKINPORT_FALLBACK_CURRENCY env var
  const fallbackCurrency = process.env.SKINPORT_FALLBACK_CURRENCY || "USD";

  if (process.env.DEBUG_SKINPORT === "true" && currencyCode !== "1") {
    console.warn(
      `[Skinport API] Currency code ${currencyCode} is not supported by Skinport. ` +
        `Falling back to ${fallbackCurrency}. ` +
        `Supported currencies: AUD, BRL, CAD, CHF, CNY, CZK, DKK, EUR, GBP, HRK, NOK, PLN, RUB, SEK, TRY, USD`
    );
  }

  return fallbackCurrency;
}

/**
 * Returns numeric price in your currency (number), or null if not available
 * Uses Skinport API with proper rate limiting
 */
export async function getSkinPrice(marketHashName, useCache = true) {
  const normalizedName = normalizeMarketHashName(marketHashName);

  // Check cache first
  if (useCache) {
    const cached = priceCache.get(normalizedName);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
      if (process.env.DEBUG_SKINPORT === "true") {
        console.log(`[Skinport API] Using cached price for "${normalizedName}": ${cached.price}`);
      }
      return cached.price;
    }
  }

  try {
    const authHeader = getAuthHeader();
    const currency = convertCurrencyCode(process.env.CURRENCY || "24");

    // Wait for rate limit before making request
    await waitForRateLimit();

    // Skinport API: Get all items and filter
    // Note: Skinport doesn't have a direct "get price for one item" endpoint
    // We need to fetch all items and find the matching one
    const url = `${BASE_URL}items`;

    const res = await axios.get(url, {
      params: {
        app_id: APP_ID,
        currency: currency,
        tradable: 1 // Only tradable items
      },
      headers: {
        Authorization: authHeader,
        Accept: "application/json"
      },
      timeout: 15000 // 15 second timeout
    });

    // Handle rate limiting (429)
    if (res.status === 429) {
      const retryAfter = res.headers["retry-after"]
        ? parseInt(res.headers["retry-after"]) * 1000
        : 300000; // Default to 5 minutes if not specified

      console.warn(
        `[Skinport API] Rate limited (429) for "${normalizedName}". ` +
          `Waiting ${retryAfter / 1000}s before retry...`
      );
      await new Promise(resolve => setTimeout(resolve, retryAfter));
      // Retry once after waiting
      return getSkinPrice(marketHashName, false); // Don't use cache on retry
    }

    if (res.status !== 200) {
      throw new Error(`HTTP ${res.status}: ${res.statusText}`);
    }

    if (!Array.isArray(res.data)) {
      if (process.env.DEBUG_SKINPORT === "true") {
        console.warn(`[Skinport API] Unexpected response format for "${normalizedName}"`);
      }
      return null;
    }

    // Find the matching item by market_hash_name
    const item = res.data.find(
      i => i.market_hash_name && i.market_hash_name.toLowerCase() === normalizedName.toLowerCase()
    );

    if (!item) {
      if (process.env.DEBUG_SKINPORT === "true") {
        console.warn(`[Skinport API] Item not found: "${normalizedName}"`);
      }
      return null;
    }

    // Extract price - Skinport provides suggested_price
    const price = item.suggested_price || item.min_price || null;

    if (!price || typeof price !== "number" || price <= 0) {
      if (process.env.DEBUG_SKINPORT === "true") {
        console.warn(`[Skinport API] Invalid price for "${normalizedName}": ${price}`);
      }
      return null;
    }

    // Cache the result
    if (useCache) {
      priceCache.set(normalizedName, {
        price: price,
        timestamp: Date.now()
      });
    }

    if (process.env.DEBUG_SKINPORT === "true") {
      console.log(`[Skinport API] Price for "${normalizedName}": ${price} ${currency}`);
    }

    return price;
  } catch (err) {
    if (
      err.message &&
      (err.message.includes("SKINPORT_CLIENT_ID") || err.message.includes("SKINPORT_CLIENT_SECRET"))
    ) {
      console.error(`[Skinport API] ${err.message}`);
      throw err;
    }

    if (err.response) {
      const status = err.response.status;

      if (status === 401) {
        console.error(
          `[Skinport API] Authentication failed. Check your SKINPORT_CLIENT_ID and SKINPORT_CLIENT_SECRET. ` +
            `Get your credentials from: https://skinport.com (Settings → API)`
        );
        throw new Error("Invalid Skinport credentials");
      }

      if (status === 400) {
        const errorMsg = err.response.data?.message || err.response.statusText || "Bad Request";
        const errorDetails = err.response.data ? JSON.stringify(err.response.data) : "";
        console.error(
          `[Skinport API] Bad Request (400) for "${normalizedName}": ${errorMsg}. ` +
            `${errorDetails ? `Details: ${errorDetails}. ` : ""}` +
            `This might be due to an unsupported currency or invalid request parameters. ` +
            `Note: INR is NOT supported by Skinport - it will automatically fallback to USD. ` +
            `Skinport supports: AUD, BRL, CAD, CHF, CNY, CZK, DKK, EUR, GBP, HRK, NOK, PLN, RUB, SEK, TRY, USD. ` +
            `Falling back to Steam API...`
        );
        return null; // Return null to allow fallback to Steam
      }

      if (status === 429) {
        console.warn(
          `[Skinport API] Rate limited (429) for "${normalizedName}". ` +
            `Consider increasing SKINPORT_API_MIN_INTERVAL_MS`
        );
        return null; // Return null instead of throwing to allow fallback
      }

      console.error(
        `[Skinport API] Error fetching price for "${normalizedName}": ` +
          `HTTP ${status} - ${err.response.statusText}`
      );
    } else {
      console.error(`[Skinport API] Error fetching price for "${normalizedName}": ${err.message}`);
    }

    return null; // Return null to allow fallback to other providers
  }
}

/**
 * Clear the price cache (useful for testing or forcing fresh data)
 */
export function clearPriceCache() {
  priceCache.clear();
}

/**
 * Check if Skinport API is configured
 */
export function isConfigured() {
  return !!(process.env.SKINPORT_CLIENT_ID && process.env.SKINPORT_CLIENT_SECRET);
}
