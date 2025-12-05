import { getSkinPrice as getSteamPrice } from "../steam/steam.js";
import { getSkinPrice as getSkinportPrice, isConfigured as isSkinportConfigured } from "../skinport/skinport.js";

/**
 * Price provider configuration
 * Determines which APIs to use and in what order
 */
const PRICE_PROVIDER = (process.env.PRICE_PROVIDER || "steam").toLowerCase();
const USE_FALLBACK = process.env.USE_PRICE_FALLBACK !== "false"; // Default: true

/**
 * Get skin price from the configured provider(s)
 * 
 * Strategy:
 * - If PRICE_PROVIDER is "skinport": Try Skinport first, fallback to Steam if enabled
 * - If PRICE_PROVIDER is "steam": Try Steam first, fallback to Skinport if enabled
 * - If PRICE_PROVIDER is "both": Return prices from both sources (experimental)
 * 
 * @param {string} marketHashName - The skin's market hash name
 * @param {boolean} useCache - Whether to use cached prices
 * @returns {Promise<number|null>} - Price as a number, or null if not found
 */
export async function getSkinPrice(marketHashName, useCache = true) {
  const providers = [];
  
  // Determine provider order based on configuration
  if (PRICE_PROVIDER === "skinport") {
    if (isSkinportConfigured()) {
      providers.push({ name: "skinport", fn: getSkinportPrice });
    }
    if (USE_FALLBACK) {
      providers.push({ name: "steam", fn: getSteamPrice });
    }
  } else if (PRICE_PROVIDER === "both") {
    // Experimental: Try both and return the first successful result
    if (isSkinportConfigured()) {
      providers.push({ name: "skinport", fn: getSkinportPrice });
    }
    providers.push({ name: "steam", fn: getSteamPrice });
  } else {
    // Default: Steam first
    providers.push({ name: "steam", fn: getSteamPrice });
    if (USE_FALLBACK && isSkinportConfigured()) {
      providers.push({ name: "skinport", fn: getSkinportPrice });
    }
  }
  
  if (providers.length === 0) {
    console.error("[Price Provider] No providers configured. Check your environment variables.");
    return null;
  }
  
  // Try providers in order
  let lastError = null;
  
  for (const provider of providers) {
    try {
      if (process.env.DEBUG_PRICE_PROVIDER === "true") {
        console.log(`[Price Provider] Trying ${provider.name} for "${marketHashName}"`);
      }
      
      const price = await provider.fn(marketHashName, useCache);
      
      if (price !== null && price > 0) {
        if (process.env.DEBUG_PRICE_PROVIDER === "true") {
          console.log(`[Price Provider] ${provider.name} returned price: ${price} for "${marketHashName}"`);
        }
        return price;
      }
      
      // Price was null or invalid, try next provider
      if (process.env.DEBUG_PRICE_PROVIDER === "true") {
        console.log(`[Price Provider] ${provider.name} returned null/invalid price for "${marketHashName}", trying next provider...`);
      }
      
    } catch (err) {
      lastError = err;
      
      // Log error but continue to next provider
      if (process.env.DEBUG_PRICE_PROVIDER === "true") {
        console.warn(
          `[Price Provider] ${provider.name} failed for "${marketHashName}": ${err.message}`
        );
      }
      
      // If this is the last provider, we'll throw the error
      if (provider === providers[providers.length - 1]) {
        throw err;
      }
      
      // Otherwise, continue to next provider
      continue;
    }
  }
  
  // All providers failed or returned null
  if (lastError) {
    throw lastError;
  }
  
  return null;
}

/**
 * Get the current provider configuration
 */
export function getProviderConfig() {
  return {
    primaryProvider: PRICE_PROVIDER,
    fallbackEnabled: USE_FALLBACK,
    skinportConfigured: isSkinportConfigured()
  };
}

