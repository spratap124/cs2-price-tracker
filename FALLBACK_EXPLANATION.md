# Why Steam API is Being Called When PRICE_PROVIDER=skinport

## The Issue

Even though you have `PRICE_PROVIDER=skinport` set, Steam API is still being called because of the **fallback mechanism**.

## How It Works

1. **Primary Provider**: When `PRICE_PROVIDER=skinport`, Skinport is tried first ✅
2. **Fallback**: By default, `USE_PRICE_FALLBACK` is `true` (if not explicitly set)
3. **When Skinport Fails**: If Skinport returns `null` or throws an error, it automatically falls back to Steam

## Current Configuration

Looking at your `.env` file:
- ✅ `PRICE_PROVIDER=skinport` - Set correctly
- ❌ `USE_PRICE_FALLBACK` - **NOT SET** (defaults to `true`)

This means:
- Skinport is tried first
- If Skinport fails (400 errors, rate limits, etc.), Steam is used as backup
- This is why you see Steam API calls in your logs

## Solution: Use ONLY Skinport

To use **ONLY** Skinport (no Steam fallback), add this to your `.env` file:

```env
PRICE_PROVIDER=skinport
USE_PRICE_FALLBACK=false
```

## Why Fallback Exists

Fallback is useful because:
- If Skinport API is down, Steam provides backup
- If Skinport doesn't have certain items, Steam might
- Provides reliability when one provider fails

However, if you want to avoid Steam rate limits completely, disable fallback.

## Check Your Logs

With `DEBUG_PRICE_PROVIDER=true`, you should see:
```
[Price Provider] Trying skinport for "Item Name"
[Price Provider] skinport returned null/invalid price..., falling back to steam...
[Price Provider] Trying steam for "Item Name"
```

This confirms that Skinport is being tried first, but failing and falling back to Steam.

