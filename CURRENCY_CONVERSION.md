# Currency Conversion Implementation

## Overview

The application now automatically converts all prices to **INR (Indian Rupees)** before saving to the database and returning in API responses. This ensures consistent pricing regardless of which price provider is used.

## How It Works

### Automatic Conversion

1. **Price Provider Integration**: The unified price provider automatically converts prices to INR:
   - **Steam API**: Returns prices in INR (currency code 24) → Used as-is
   - **Skinport API**: Returns prices in USD → Automatically converted to INR using live exchange rates

2. **Exchange Rate Source**: Uses [exchangerate-api.com](https://exchangerate-api.com) (free, no API key required)

3. **Caching**: Exchange rates are cached for 1 hour to reduce API calls

### Conversion Flow

```
Price from API → Detect Provider → Convert to INR → Save to DB → Return in API Response
```

Example:
- Skinport returns: `$10.50 USD`
- Converter fetches live rate: `1 USD = 83.5 INR`
- Converts: `10.50 * 83.5 = 876.75 INR`
- Saves: `876.75` in database
- Returns: `876.75` in API response

## Features

✅ **Automatic**: No manual conversion needed  
✅ **Live Rates**: Uses real-time exchange rates  
✅ **Cached**: Rates cached for 1 hour (configurable)  
✅ **Fallback**: Uses default rate if API fails  
✅ **Transparent**: All prices in database and API are in INR  

## Configuration

### Environment Variables

Add to your `.env` file (optional):

```env
# Fallback exchange rate if API fails (default: 83.5)
FALLBACK_USD_TO_INR_RATE=83.5

# Enable debug logging for currency conversion
DEBUG_CURRENCY=true
```

### Default Behavior

- Exchange rates are fetched from exchangerate-api.com
- Rates are cached for 1 hour
- If API fails, uses fallback rate (default: 83.5)
- If cached rate is stale but fetch fails, uses stale cached rate

## Usage

### In Tracker Creation

When creating a tracker, prices are automatically converted:

```javascript
// POST /track
{
  "skinName": "AK-47 | Redline (Field-Tested)",
  "targetDown": 1800,  // Always in INR
  "targetUp": 2500     // Always in INR
}

// Response: All prices in INR
{
  "lastKnownPrice": 1950.50,  // Already converted to INR
  "targetDown": 1800,          // Your input (INR)
  "targetUp": 2500             // Your input (INR)
}
```

### In Price Checking

The cron job automatically converts prices before saving:

```javascript
// Price from Skinport: $10.50 USD
// Automatically converted to: 876.75 INR
// Saved in database: 876.75
```

## Implementation Details

### Files Created

1. **`src/utils/currencyConverter.js`**
   - Fetches live exchange rates
   - Caches rates for 1 hour
   - Handles errors gracefully

2. **`src/utils/priceConverter.js`**
   - Converts prices based on provider
   - Steam → INR (already INR, no conversion)
   - Skinport → INR (USD to INR conversion)

### Files Modified

1. **`src/providers/priceProvider.js`**
   - Automatically converts all prices to INR
   - No changes needed in other files

## Currency Support

### Supported Currencies

- **INR** (Indian Rupees) - All prices stored and returned in INR
- **USD** (US Dollars) - Automatically converted from Skinport
- Other currencies can be added by extending the converter

### Database Storage

All prices in the database are stored in **INR**:
- `lastKnownPrice`: INR
- `targetDown`: INR (user input)
- `targetUp`: INR (user input)
- `lastDownAlertPrice`: INR
- `lastUpAlertPrice`: INR

## API Responses

All API responses return prices in **INR**:

```json
{
  "_id": "...",
  "skinName": "AK-47 | Redline (Field-Tested)",
  "lastKnownPrice": 1950.50,
  "targetDown": 1800,
  "targetUp": 2500,
  "interest": "buy"
}
```

## Testing

Enable debug logging to see conversion details:

```env
DEBUG_CURRENCY=true
DEBUG_PRICE_PROVIDER=true
```

You'll see logs like:
```
[Currency Converter] Fetching exchange rate from USD to INR...
[Currency Converter] Fetched rate: 1 USD = 83.5 INR
[Price Converter] Converted 10.5 USD to 876.75 INR
[Price Provider] Converted 10.5 (skinport) to 876.75 INR for "AK-47 | Redline"
```

## Notes

- Exchange rates are updated automatically (cached for 1 hour)
- If exchange rate API fails, uses fallback rate
- All prices are consistently in INR across the application
- User input prices are assumed to be in INR

