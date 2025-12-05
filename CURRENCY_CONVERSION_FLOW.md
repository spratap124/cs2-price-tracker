# Currency Conversion Flow - How It Works

## Overview

All prices in the system are automatically converted to **INR (Indian Rupees)** before being saved to the database and displayed in notifications.

## Complete Flow

### 1. Price Fetching (Cron Job or Tracker Creation)

```
getSkinPrice() → Price Provider → Provider API → Currency Conversion → INR Price → Save to DB
```

**Step-by-step:**
1. `getSkinPrice()` is called (from `priceProvider.js`)
2. Price provider calls the configured API (Steam or Skinport)
3. **Steam API**: Returns price in INR (currency code 24) → Used as-is
4. **Skinport API**: Returns price in USD → **Automatically converted to INR**
5. Converted price (in INR) is returned
6. Price is saved to database (in INR)
7. Price is passed to alerts (already in INR)

### 2. Currency Conversion Details

**Location**: `src/utils/priceConverter.js` → `src/utils/currencyConverter.js`

- Uses live exchange rates from `exchangerate-api.com` (free, no API key)
- Exchange rates cached for 1 hour
- Automatically converts USD → INR when using Skinport
- Steam prices (already INR) pass through unchanged

### 3. Alert Notifications

**Location**: `src/alert/alert.js`

- All prices are already in INR when passed to alerts
- Alert formatting uses **₹** symbol (INR)
- All price displays show INR values

## Why You Might Still See "$" in Notifications

If you're still seeing "$" in notifications, it could be:

1. **Old Notification**: Notification sent before code was updated
2. **Server Not Restarted**: Need to restart server for changes to take effect
3. **Old Data**: Prices saved before conversion was implemented (in USD format)

## Solution

1. **Restart your server** to apply all changes
2. **New trackers** will have prices in INR automatically
3. **New notifications** will show ₹ symbol
4. For existing trackers, you may need to recreate them or wait for next price check

## Verification

Enable debug logging to see conversion in action:

```env
DEBUG_CURRENCY=true
DEBUG_PRICE_PROVIDER=true
```

You should see logs like:
```
[Price Provider] Trying skinport for "Item Name"
[Price Provider] skinport returned price: 10.5 for "Item Name"
[Currency Converter] Fetching exchange rate from USD to INR...
[Currency Converter] Fetched rate: 1 USD = 83.5 INR
[Price Converter] Converted 10.5 USD to 876.75 INR
[Price Provider] Converted 10.5 (skinport) to 876.75 INR for "Item Name"
```

## Expected Behavior

✅ **All prices in database**: INR  
✅ **All API responses**: INR  
✅ **All notifications**: ₹ symbol with INR values  
✅ **Automatic conversion**: USD prices converted to INR  

