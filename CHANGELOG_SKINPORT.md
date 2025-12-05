# Skinport API Integration - Changes Made

## Summary

The application has been updated to support multiple price providers, including the new Skinport API. This allows for more reliable price tracking with better rate limit handling.

## Files Changed

### 1. **src/cron/priceCheck.js**

- ✅ Changed import from `../steam/steam.js` to `../providers/priceProvider.js`
- Now uses unified price provider that supports both Steam and Skinport

### 2. **src/routes/tracker.js**

- ✅ Changed price import from `../steam/steam.js` to `../providers/priceProvider.js`
- Still uses Steam for image URLs (Skinport image support can be added later)

### 3. **.env.example**

- ✅ Added new configuration options:
  - `PRICE_PROVIDER` - Choose provider (steam/skinport/both)
  - `USE_PRICE_FALLBACK` - Enable fallback to other providers
  - `SKINPORT_CLIENT_ID` - Your Skinport Client ID
  - `SKINPORT_CLIENT_SECRET` - Your Skinport Client Secret
  - `SKINPORT_API_MIN_INTERVAL_MS` - Rate limiting for Skinport
  - `DEBUG_SKINPORT` - Debug logging for Skinport
  - `DEBUG_PRICE_PROVIDER` - Debug logging for provider selection

## New Files Created

### 1. **src/skinport/skinport.js**

- Complete Skinport API implementation
- Uses Basic Authentication with Client ID and Client Secret ([docs](https://docs.skinport.com/introduction/authentication))
- Handles rate limiting (8 requests per 5 minutes)
- Currency conversion support
- Caching and error handling

### 2. **src/providers/priceProvider.js**

- Unified price provider that routes to appropriate API
- Supports fallback between providers
- Configurable via environment variables

### 3. **Documentation**

- `SKINPORT_API.md` - Detailed API information
- `SKINPORT_SETUP.md` - Setup guide
- Updated `API_ALTERNATIVES.md` - Added Skinport info
- Updated `README.md` - Added Skinport mention

## How to Use

### Option 1: Continue Using Steam (Default - No Changes Needed)

- No configuration needed
- Everything works as before
- System will use Steam API by default

### Option 2: Switch to Skinport API

1. Get your Client ID and Client Secret from [Skinport.com](https://skinport.com) (Settings → API)

2. Add to your `.env` file:

   ```env
   PRICE_PROVIDER=skinport
   SKINPORT_CLIENT_ID=your_client_id_here
   SKINPORT_CLIENT_SECRET=your_client_secret_here
   ```

3. Restart your server

### Option 3: Use Fallback (Steam → Skinport)

Add to your `.env`:

```env
PRICE_PROVIDER=steam
USE_PRICE_FALLBACK=true
SKINPORT_CLIENT_ID=your_client_id_here
SKINPORT_CLIENT_SECRET=your_client_secret_here
```

If Steam fails or is rate-limited, it will automatically fallback to Skinport.

## Benefits

✅ **More reliable** - Skinport has documented rate limits  
✅ **Better error handling** - Automatic fallback between providers  
✅ **Flexible** - Choose which provider to use via config  
✅ **Backward compatible** - Defaults to Steam, no breaking changes

## Migration Notes

- **No code changes required** if you want to keep using Steam
- The unified provider maintains the same interface
- All existing functionality continues to work
- You can switch providers anytime via environment variables

## Testing

To test the integration:

1. Set debug logging:

   ```env
   DEBUG_PRICE_PROVIDER=true
   DEBUG_SKINPORT=true
   ```

2. Check your logs to see which provider is being used

3. Monitor for any rate limiting issues

## Need Help?

- Setup Guide: See [SKINPORT_SETUP.md](SKINPORT_SETUP.md)
- API Details: See [SKINPORT_API.md](SKINPORT_API.md)
- All Alternatives: See [API_ALTERNATIVES.md](API_ALTERNATIVES.md)
