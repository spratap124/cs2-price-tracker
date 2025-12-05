# CS2 Price Tracker

Tracks CS2 (CS:GO/CS2) skin prices from Steam Community Market and alerts when prices cross user-provided up/down targets.

## Setup

1. Copy files into a folder.
2. Get your MongoDB Atlas connection string:
   - Create a free cluster at [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
   - Create a database user and get your connection string
   - Whitelist your IP address (or use `0.0.0.0/0` for development)
3. Get your Discord webhook URL (optional, for price alerts):
   - Open your Discord server
   - Go to **Server Settings** → **Integrations** → **Webhooks**
   - Click **New Webhook** or **Create Webhook**
   - Name it (e.g., "CS2 Price Alerts") and select the channel where you want alerts
   - Click **Copy Webhook URL**
4. `cp .env.example .env` and fill in:
   - Your MongoDB Atlas connection string (replace `<db_password>` with your actual password)
   - Your Discord webhook URL (if you want alerts)
5. `npm install`
6. `npm run dev` (or `npm start`)

## API

POST /track
{
"skinName": "AK-47 | Redline (Field-Tested)",
"targetDown": 1800,
"targetUp": 2500
}

GET /track -> list all trackers

## Configuration

### Environment Variables

Add these to your `.env` file:

```env
# MongoDB connection string
MONGODB_URI=mongodb+srv://...

# Discord webhook URL (optional)
DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/...

# Price check interval in minutes (default: 5)
CHECK_INTERVAL_MINUTES=5

# Minimum time between Steam API requests in milliseconds (default: 5000 = 5 seconds)
STEAM_API_MIN_INTERVAL_MS=5000

# Currency code (default: 24 = INR)
CURRENCY=24

# Enable debug logging for Steam API (optional)
DEBUG_STEAM=false
```

### Rate Limiting

The application includes built-in rate limiting with:
- Automatic retry with exponential backoff
- 5-minute price caching to reduce redundant API calls
- Configurable request intervals

If you're still experiencing 429 (rate limit) errors:
1. Increase `STEAM_API_MIN_INTERVAL_MS` to 10000 (10 seconds) or higher
2. Increase `CHECK_INTERVAL_MINUTES` to reduce frequency
3. See [API_ALTERNATIVES.md](API_ALTERNATIVES.md) for more options

## Notes

- Uses Discord webhook for alerts by default. Replace `sendAlert` in `src/alert/alert.js` to support other transports.
- The application automatically handles rate limiting with retry logic and caching.
- For information about alternative APIs and solutions, see [API_ALTERNATIVES.md](API_ALTERNATIVES.md).
