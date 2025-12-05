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

## Notes

- Uses Discord webhook for alerts by default. Replace `sendAlert` in `src/alert/alert.js` to support other transports.
- Rate-limit your checks responsibly; Steam may throttle repeated requests.
