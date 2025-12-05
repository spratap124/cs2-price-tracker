import { usdToInr } from "./currencyConverter.js";

/**
 * Convert price to INR if needed
 * - Steam prices are already in INR (currency code 24)
 * - Skinport prices are in USD (INR not supported)
 * @param {number} price - Price to convert
 * @param {string} sourceCurrency - Currency of the price (USD or INR)
 * @returns {Promise<number|null>} - Price in INR
 */
export async function convertPriceToInr(price, sourceCurrency = "USD") {
  if (!price || price <= 0 || isNaN(price)) {
    return null;
  }

  // If already in INR, return as-is
  if (sourceCurrency === "INR" || sourceCurrency === "inr") {
    return price;
  }

  // Convert from USD to INR
  if (sourceCurrency === "USD" || sourceCurrency === "usd") {
    const convertedPrice = await usdToInr(price);
    
    if (process.env.DEBUG_CURRENCY === "true") {
      console.log(`[Price Converter] Converted ${price} USD to ${convertedPrice} INR`);
    }
    
    return convertedPrice;
  }

  // Unknown currency, return as-is (better than failing)
  console.warn(`[Price Converter] Unknown source currency: ${sourceCurrency}, returning price as-is`);
  return price;
}

/**
 * Determine which provider was used and convert price accordingly
 * @param {number} price - Price from API
 * @param {string} providerName - Name of provider (steam/skinport)
 * @returns {Promise<number|null>} - Price in INR
 */
export async function convertProviderPriceToInr(price, providerName) {
  if (!price || price <= 0) {
    return null;
  }

  // Steam returns prices in INR (currency code 24)
  if (providerName === "steam") {
    return price; // Already in INR
  }

  // Skinport returns prices in USD
  if (providerName === "skinport") {
    return await convertPriceToInr(price, "USD");
  }

  // Default: assume USD and convert
  return await convertPriceToInr(price, "USD");
}

