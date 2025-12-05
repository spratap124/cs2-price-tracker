import axios from "axios";

// Exchange rate cache
const exchangeRateCache = new Map();
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour cache for exchange rates

// Last fetch time to avoid too frequent requests
let lastFetchTime = 0;
const MIN_FETCH_INTERVAL_MS = 5 * 60 * 1000; // Minimum 5 minutes between fetches

/**
 * Get exchange rate from USD to INR using a free API
 * Uses exchangerate-api.com (no API key required, free tier)
 */
async function getExchangeRate(fromCurrency = "USD", toCurrency = "INR") {
  const cacheKey = `${fromCurrency}_${toCurrency}`;
  const cached = exchangeRateCache.get(cacheKey);

  // Return cached rate if still valid
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    if (process.env.DEBUG_CURRENCY === "true") {
      console.log(`[Currency Converter] Using cached rate: 1 ${fromCurrency} = ${cached.rate} ${toCurrency}`);
    }
    return cached.rate;
  }

  // Rate limit: Don't fetch too frequently
  const now = Date.now();
  if (now - lastFetchTime < MIN_FETCH_INTERVAL_MS) {
    if (cached) {
      // Use stale cache if we have it (better than nothing)
      if (process.env.DEBUG_CURRENCY === "true") {
        console.log(`[Currency Converter] Using stale cached rate (fetch too recent): 1 ${fromCurrency} = ${cached.rate} ${toCurrency}`);
      }
      return cached.rate;
    }
  }

  try {
    // Try exchangerate-api.com first (free, no API key)
    const url = `https://api.exchangerate-api.com/v4/latest/${fromCurrency}`;
    
    if (process.env.DEBUG_CURRENCY === "true") {
      console.log(`[Currency Converter] Fetching exchange rate from ${fromCurrency} to ${toCurrency}...`);
    }

    const res = await axios.get(url, {
      timeout: 5000,
      headers: {
        "Accept": "application/json"
      }
    });

    if (res.data && res.data.rates && res.data.rates[toCurrency]) {
      const rate = res.data.rates[toCurrency];
      
      // Cache the rate
      exchangeRateCache.set(cacheKey, {
        rate: rate,
        timestamp: Date.now()
      });

      lastFetchTime = Date.now();

      if (process.env.DEBUG_CURRENCY === "true") {
        console.log(`[Currency Converter] Fetched rate: 1 ${fromCurrency} = ${rate} ${toCurrency}`);
      }

      return rate;
    } else {
      throw new Error(`Exchange rate for ${toCurrency} not found in response`);
    }
  } catch (err) {
    console.error(`[Currency Converter] Error fetching exchange rate: ${err.message}`);
    
    // If we have a cached rate, use it even if stale
    if (cached) {
      console.warn(`[Currency Converter] Using stale cached rate due to fetch error: 1 ${fromCurrency} = ${cached.rate} ${toCurrency}`);
      return cached.rate;
    }

    // Fallback: Use a reasonable default rate if API fails (around 83-84 INR per USD as of 2024)
    const fallbackRate = Number(process.env.FALLBACK_USD_TO_INR_RATE || 83.5);
    console.warn(`[Currency Converter] Using fallback rate: 1 ${fromCurrency} = ${fallbackRate} ${toCurrency}`);
    
    // Cache the fallback rate
    exchangeRateCache.set(cacheKey, {
      rate: fallbackRate,
      timestamp: Date.now()
    });

    return fallbackRate;
  }
}

/**
 * Convert price from one currency to another
 * @param {number} amount - The amount to convert
 * @param {string} fromCurrency - Source currency (default: USD)
 * @param {string} toCurrency - Target currency (default: INR)
 * @returns {Promise<number>} - Converted amount
 */
export async function convertCurrency(amount, fromCurrency = "USD", toCurrency = "INR") {
  if (!amount || amount <= 0 || isNaN(amount)) {
    return null;
  }

  // No conversion needed if same currency
  if (fromCurrency === toCurrency) {
    return amount;
  }

  try {
    const rate = await getExchangeRate(fromCurrency, toCurrency);
    const converted = amount * rate;
    
    // Round to 2 decimal places
    return Math.round(converted * 100) / 100;
  } catch (err) {
    console.error(`[Currency Converter] Error converting ${amount} ${fromCurrency} to ${toCurrency}: ${err.message}`);
    return null;
  }
}

/**
 * Convert price from USD to INR (most common use case)
 * @param {number} usdAmount - Price in USD
 * @returns {Promise<number>} - Price in INR
 */
export async function usdToInr(usdAmount) {
  return convertCurrency(usdAmount, "USD", "INR");
}

/**
 * Clear exchange rate cache (useful for testing)
 */
export function clearCache() {
  exchangeRateCache.clear();
  lastFetchTime = 0;
}
