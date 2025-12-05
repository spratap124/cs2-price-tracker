# Skinport API Setup Guide

## Quick Start

### 1. Get Your Skinport API Credentials

1. Go to [Skinport.com](https://skinport.com)
2. Create an account or log in
3. Navigate to **Settings → API**
4. Generate your **Client ID** and **Client Secret**
5. Copy both credentials (keep them secure!)

### 2. Configure Your .env File

Add these variables to your `.env` file:

```env
# Price Provider Configuration
# Options: "steam" (default), "skinport", or "both" (experimental)
PRICE_PROVIDER=skinport

# Enable fallback to other providers if primary fails (default: true)
USE_PRICE_FALLBACK=true

# Skinport API Configuration
# Get your credentials from: https://skinport.com (Settings → API)
SKINPORT_CLIENT_ID=your_client_id_here
SKINPORT_CLIENT_SECRET=your_client_secret_here

# Optional: Adjust Skinport rate limiting (default: 37500ms = 37.5 seconds)
# Skinport allows 8 requests per 5 minutes
SKINPORT_API_MIN_INTERVAL_MS=37500

# Optional: Enable debug logging
DEBUG_SKINPORT=true
DEBUG_PRICE_PROVIDER=true
```

### 3. Update Your Code (Optional)

The codebase already includes a unified price provider. You can:

**Option A: Use the provider directly (Recommended)**
```javascript
// In src/cron/priceCheck.js, replace:
import { getSkinPrice } from "../steam/steam.js";

// With:
import { getSkinPrice } from "../providers/priceProvider.js";
```

**Option B: Keep using Steam directly**
- Just don't set `PRICE_PROVIDER=skinport`
- System will continue using Steam API

## Configuration Options

### Provider Selection

```env
# Use Steam only (default)
PRICE_PROVIDER=steam

# Use Skinport only
PRICE_PROVIDER=skinport

# Use Steam first, fallback to Skinport (requires API key)
PRICE_PROVIDER=steam
USE_PRICE_FALLBACK=true

# Use Skinport first, fallback to Steam
PRICE_PROVIDER=skinport
USE_PRICE_FALLBACK=true
```

### Rate Limiting

Skinport allows **8 requests per 5 minutes** (one request every 37.5 seconds).

Adjust if needed:
```env
# More conservative (wait 40 seconds between requests)
SKINPORT_API_MIN_INTERVAL_MS=40000

# Less conservative (may hit rate limits faster)
SKINPORT_API_MIN_INTERVAL_MS=30000
```

## Testing

1. Set your API key in `.env`
2. Enable debug logging:
   ```env
   DEBUG_SKINPORT=true
   DEBUG_PRICE_PROVIDER=true
   ```
3. Restart your server
4. Check logs to see which provider is being used

## Troubleshooting

### "SKINPORT_CLIENT_ID and SKINPORT_CLIENT_SECRET environment variables are required"
- Make sure you've added both `SKINPORT_CLIENT_ID` and `SKINPORT_CLIENT_SECRET` to your `.env` file
- Restart your server after adding them

### "Authentication failed" or 401 errors
- Your Client ID or Client Secret is invalid or expired
- Generate new credentials from Skinport settings
- Make sure there are no extra spaces in your `.env` file
- Verify you're using Basic Authentication correctly (see [docs](https://docs.skinport.com/introduction/authentication))

### Still getting rate limited
- Skinport has stricter limits than expected
- Increase `SKINPORT_API_MIN_INTERVAL_MS` to 45000 or higher
- Reduce `CHECK_INTERVAL_MINUTES` to check less frequently

### Prices are different from Steam
- This is normal! Skinport prices reflect the Skinport marketplace
- Prices can differ significantly between platforms
- Consider which prices your users care about

### "Bad Request (400)" errors
- **INR (Indian Rupee) is NOT supported by Skinport API**
- If you're using `CURRENCY=24` (INR), the system will automatically fallback to USD for Skinport
- Steam API will still use INR, but Skinport will use USD
- To use a different fallback currency, set `SKINPORT_FALLBACK_CURRENCY=EUR` (or any supported currency)
- See [SKINPORT_API.md](SKINPORT_API.md) for supported currencies

## Comparison: Steam vs Skinport

| Feature | Steam | Skinport |
|---------|-------|----------|
| **Rate Limit** | Very strict, unpredictable | 8 req/5min (documented) |
| **Reliability** | Often rate limited | More reliable |
| **Price Source** | Steam Market | Skinport Marketplace |
| **Setup** | No API key needed | Requires Client ID + Secret |
| **Cost** | Free | Free |

## Need Help?

- Skinport API Docs: https://docs.skinport.com
- See [SKINPORT_API.md](SKINPORT_API.md) for detailed API information
- See [API_ALTERNATIVES.md](API_ALTERNATIVES.md) for all alternatives

