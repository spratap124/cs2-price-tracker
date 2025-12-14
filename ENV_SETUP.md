# Environment Configuration Guide

This project uses separate environment files for development and production.

## Environment Files

- **`.env.development`** - Local development configuration
- **`.env.production`** - Production deployment configuration (Raspberry Pi)
- **`.env.example`** - Template with all available variables

## How It Works

The application automatically loads the correct environment file based on `NODE_ENV`:

- `NODE_ENV=development` → loads `.env.development`
- `NODE_ENV=production` → loads `.env.production`
- Falls back to `.env` if environment-specific file doesn't exist (for backwards compatibility)

## Setup Instructions

### For Local Development

1. Copy the example file:

   ```bash
   cp .env.example .env.development
   ```

2. Edit `.env.development` and fill in your values:
   - MongoDB connection string
   - CORS origins (localhost URLs)
   - Any optional API keys

3. Run in development mode:
   ```bash
   npm run dev
   ```
   This automatically sets `NODE_ENV=development`

### For Production (Raspberry Pi)

1. Copy the example file:

   ```bash
   cp .env.example .env.production
   ```

2. Edit `.env.production` and fill in your values:
   - MongoDB connection string
   - CORS origins (production domains)
   - Production API keys
   - Set debug flags to `false`

3. Run in production mode:

   ```bash
   npm start
   ```

   This automatically sets `NODE_ENV=production`

   Or with PM2:

   ```bash
   pm2 start ecosystem.config.js
   ```

## Environment Variables

### Required Variables

- `MONGODB_URI` - MongoDB Atlas connection string
- `NODE_ENV` - Environment mode (development/production)

### Optional Variables

#### Server Configuration

- `PORT` - Server port (default: 3001)
- `ALLOWED_ORIGINS` - Comma-separated list of allowed CORS origins

#### Price Provider

- `PRICE_PROVIDER` - "steam" or "skinport" (default: "steam")
- `USE_PRICE_FALLBACK` - Use fallback if primary fails (default: true)

#### Steam API

- `STEAM_API_MIN_INTERVAL_MS` - Minimum time between requests (default: 10000)
- `CURRENCY` - Currency code (default: 24 = INR)
- `USER_AGENT` - User agent string

#### Skinport API

- `SKINPORT_API_KEY` - Your Skinport API key
- `SKINPORT_API_MIN_INTERVAL_MS` - Minimum time between requests (default: 37500)

#### Cron Job

- `CHECK_INTERVAL_MINUTES` - Price check interval (default: 5)

#### Discord

- `DISCORD_WEBHOOK_URL` - Discord webhook for alerts

#### Debug Flags

- `DEBUG_STEAM` - Enable Steam API debug logs
- `DEBUG_SKINPORT` - Enable Skinport API debug logs
- `DEBUG_PRICE_PROVIDER` - Enable price provider debug logs

## Differences Between Environments

### Development (`.env.development`)

- Allows localhost origins in CORS
- Debug flags can be enabled
- More lenient rate limiting
- User agent includes "-dev" suffix

### Production (`.env.production`)

- Only allows production domains in CORS
- Debug flags should be `false`
- Optimized for reliability
- Standard user agent

## Security Notes

⚠️ **Important**:

- Never commit `.env.development` or `.env.production` to git
- These files are already in `.gitignore`
- Only commit `.env.example` as a template
- Keep your MongoDB credentials and API keys secure

## Troubleshooting

### Environment file not loading?

- Check that `NODE_ENV` is set correctly
- Verify the file exists (`.env.development` or `.env.production`)
- Check file permissions

### Wrong configuration being used?

- Verify `NODE_ENV` environment variable
- Check which file is being loaded in server startup logs
- Ensure you're using the correct npm script (`npm run dev` vs `npm start`)

### PM2 not using production config?

- PM2's `ecosystem.config.js` sets `NODE_ENV=production` automatically
- Make sure `.env.production` exists on your Raspberry Pi
- Check PM2 logs: `pm2 logs cs2-price-tracker`
