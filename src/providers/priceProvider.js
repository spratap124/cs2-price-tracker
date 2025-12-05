import { getSkinPrice as getSteamPrice } from "../steam/steam.js";
import {
  getSkinPrice as getSkinportPrice,
  isConfigured as isSkinportConfigured
} from "../skinport/skinport.js";
import { convertProviderPriceToInr } from "../utils/priceConverter.js";

/**
 * Get current price provider configuration (read at runtime, not module load time)
 */
function getPriceProviderConfig() {
  const priceProvider = (process.env.PRICE_PROVIDER || "steam").toLowerCase();
  const useFallback = process.env.USE_PRICE_FALLBACK !== "false"; // Default: true
  return { priceProvider, useFallback };
}

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

  // Read configuration at runtime (not module load time) to ensure env vars are loaded
  const { priceProvider, useFallback } = getPriceProviderConfig();

  // Log configuration for debugging
  if (process.env.DEBUG_PRICE_PROVIDER === "true") {
    console.log(
      `[Price Provider] Config: provider=${priceProvider}, fallback=${useFallback}, skinportConfigured=${isSkinportConfigured()}`
    );
  }

  // Determine provider order based on configuration
  if (priceProvider === "skinport") {
    if (isSkinportConfigured()) {
      providers.push({ name: "skinport", fn: getSkinportPrice });
    }
    if (useFallback) {
      providers.push({ name: "steam", fn: getSteamPrice });
    }
  } else if (priceProvider === "both") {
    // Experimental: Try both and return the first successful result
    if (isSkinportConfigured()) {
      providers.push({ name: "skinport", fn: getSkinportPrice });
    }
    providers.push({ name: "steam", fn: getSteamPrice });
  } else {
    // Default: Steam first
    providers.push({ name: "steam", fn: getSteamPrice });
    if (useFallback && isSkinportConfigured()) {
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
          console.log(
            `[Price Provider] ${provider.name} returned price: ${price} for "${marketHashName}"`
          );
        }

        // Convert price to INR if needed (Skinport returns USD, Steam returns INR)
        const priceInInr = await convertProviderPriceToInr(price, provider.name);

        if (priceInInr && priceInInr !== price && process.env.DEBUG_PRICE_PROVIDER === "true") {
          console.log(
            `[Price Provider] Converted ${price} (${provider.name}) to ${priceInInr} INR for "${marketHashName}"`
          );
        }

        return priceInInr;
      }

      // Price was null or invalid, try next provider
      if (providers.length > 1) {
        console.log(
          `[Price Provider] ${provider.name} returned null/invalid price for "${marketHashName}", ` +
            `falling back to ${providers[providers.indexOf(provider) + 1]?.name || "next provider"}...`
        );
      } else if (process.env.DEBUG_PRICE_PROVIDER === "true") {
        console.log(
          `[Price Provider] ${provider.name} returned null/invalid price for "${marketHashName}"`
        );
      }
    } catch (err) {
      lastError = err;

      // Log error but continue to next provider
      if (providers.length > 1) {
        console.warn(
          `[Price Provider] ${provider.name} failed for "${marketHashName}": ${err.message}. ` +
            `Falling back to ${providers[providers.indexOf(provider) + 1]?.name || "next provider"}...`
        );
      } else {
        console.error(
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
  const { priceProvider, useFallback } = getPriceProviderConfig();
  return {
    primaryProvider: priceProvider,
    fallbackEnabled: useFallback,
    skinportConfigured: isSkinportConfigured()
  };
}
