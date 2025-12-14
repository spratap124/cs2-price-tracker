# Quick Start Guide - Raspberry Pi Deployment

## Prerequisites Checklist

- [ ] Raspberry Pi with SSH access
- [ ] Cloudflare account (free)
- [ ] MongoDB Atlas connection string
- [ ] Domain `suryapratap.in` added to Cloudflare

## Deployment Steps (5 minutes)

### 1. Transfer Files to Raspberry Pi

```bash
# From your local machine
scp -r cs2-price-tracker pi@<raspberry-pi-ip>:~/
ssh pi@<raspberry-pi-ip>
cd ~/cs2-price-tracker
```

### 2. Run Setup Script

```bash
./setup-raspberry-pi.sh
```

### 3. Configure Environment

```bash
nano .env
# Add your MONGODB_URI
```

### 4. Set Up Cloudflare Tunnel

```bash
./setup-cloudflare-tunnel.sh
# Follow the interactive prompts
```

### 5. Update Frontend

In your `suryapratap.in/projects/cs2-price-tracker.html`, update:

```javascript
const API_BASE_URL = "https://cs2-api.suryapratap.in"; // Your tunnel subdomain
```

## Verify Deployment

### Test Local Connection

```bash
curl http://localhost:3001
```

### Test Public Connection

```bash
curl https://cs2-api.suryapratap.in
```

### Check PM2 Status

```bash
pm2 status
pm2 logs cs2-price-tracker
```

### Check Cloudflare Tunnel

```bash
sudo systemctl status cloudflared
sudo journalctl -u cloudflared -f
```

## Common Issues

**Problem**: API not accessible from internet

- **Solution**: Check Cloudflare Tunnel status and DNS records

**Problem**: CORS errors in browser

- **Solution**: Add your API subdomain to `ALLOWED_ORIGINS` in `.env` or update `server.js`

**Problem**: PM2 not starting on boot

- **Solution**: Run `pm2 startup` and execute the provided command

**Problem**: Application crashes

- **Solution**: Check logs with `pm2 logs cs2-price-tracker`

## Updating the Application

```bash
cd ~/cs2-price-tracker
git pull  # or transfer new files
npm install
pm2 restart cs2-price-tracker
```

## Security Notes

1. Keep your `.env` file secure - never commit it
2. Use strong MongoDB Atlas credentials
3. Cloudflare Tunnel provides HTTPS automatically
4. Rate limiting is already configured in the app
