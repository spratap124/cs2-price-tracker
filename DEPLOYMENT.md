# Deployment Guide for Raspberry Pi

This guide will help you deploy the CS2 Price Tracker API on a Raspberry Pi and make it securely accessible from the internet without buying a domain.

## Prerequisites

- Raspberry Pi with Raspberry Pi OS (or similar Linux distribution)
- Node.js installed (v18 or higher recommended)
- Access to your Raspberry Pi via SSH
- A Cloudflare account (free) - for Cloudflare Tunnel
- Your MongoDB Atlas connection string

## Option 1: Cloudflare Tunnel (Recommended - No Domain Needed)

Cloudflare Tunnel is a free service that creates a secure connection between your Raspberry Pi and Cloudflare's network, allowing you to access your API without exposing your IP or buying a domain.

### Step 1: Install Cloudflared on Raspberry Pi

```bash
# For ARM64 (Raspberry Pi 4/5)
curl -L https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-arm64 -o /usr/local/bin/cloudflared
chmod +x /usr/local/bin/cloudflared

# For ARM32 (Raspberry Pi 3 and older)
curl -L https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-arm -o /usr/local/bin/cloudflared
chmod +x /usr/local/bin/cloudflared
```

### Step 2: Authenticate Cloudflared

```bash
cloudflared tunnel login
```

This will open a browser window. Log in with your Cloudflare account and select the domain you want to use (suryapratap.in).

### Step 3: Create a Tunnel

```bash
cloudflared tunnel create cs2-api
```

This creates a tunnel named "cs2-api" and generates a UUID. Note the tunnel ID that's displayed.

### Step 4: Configure the Tunnel

Edit the Cloudflare Tunnel config file (created in setup script):

```bash
sudo nano /etc/cloudflared/config.yml
```

The configuration should look like:

```yaml
tunnel: <YOUR_TUNNEL_ID>
credentials-file: /etc/cloudflared/<TUNNEL_ID>.json

ingress:
  - hostname: cs2-api.suryapratap.in # Or any subdomain you prefer
    service: http://localhost:3001
  - service: http_status:404
```

### Step 5: Create DNS Record

```bash
cloudflared tunnel route dns cs2-api cs2-api.suryapratap.in
```

Replace `cs2-api` with your tunnel name and `cs2-api.suryapratap.in` with your desired subdomain.

### Step 6: Install Cloudflared as a Service

```bash
sudo cloudflared service install
sudo systemctl enable cloudflared
sudo systemctl start cloudflared
```

### Step 7: Update CORS in server.js

The CORS configuration should include your tunnel URL. Update `server.js` to include:

- `https://cs2-api.suryapratap.in` (or your chosen subdomain)
- `https://suryapratap.in`

## Option 2: Using a Subdomain (If You Control DNS)

If you control the DNS for `suryapratap.in`, you can set up a subdomain like `api.suryapratap.in` or `cs2-api.suryapratap.in`.

### Step 1: Set Up Reverse Proxy with Nginx

Install Nginx:

```bash
sudo apt update
sudo apt install nginx certbot python3-certbot-nginx
```

### Step 2: Configure Nginx

Create a config file:

```bash
sudo nano /etc/nginx/sites-available/cs2-api
```

Add:

```nginx
server {
    listen 80;
    server_name cs2-api.suryapratap.in;

    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Enable the site:

```bash
sudo ln -s /etc/nginx/sites-available/cs2-api /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### Step 3: Set Up SSL with Let's Encrypt

```bash
sudo certbot --nginx -d cs2-api.suryapratap.in
```

### Step 4: Update DNS

Add an A record in your DNS settings:

- Name: `cs2-api` (or `api`)
- Type: `A`
- Value: Your Raspberry Pi's public IP address

## Setting Up the Node.js Application

### Step 1: Install Node.js (if not already installed)

```bash
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs
```

### Step 2: Clone/Transfer Your Project

```bash
cd ~
git clone <your-repo-url> cs2-price-tracker
# OR transfer files via SCP/SFTP
cd cs2-price-tracker
```

### Step 3: Install Dependencies

```bash
npm install
```

### Step 4: Set Up Environment Variables

```bash
cp .env.example .env
nano .env
```

Fill in:

```env
MONGODB_URI=your_mongodb_atlas_connection_string
PORT=3001
NODE_ENV=production
```

### Step 5: Install PM2 for Process Management

```bash
sudo npm install -g pm2
```

### Step 6: Start the Application with PM2

```bash
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

The last command will show you a command to run with sudo - run it to enable PM2 on boot.

## Updating Your Frontend

In your frontend HTML file (`suryapratap.in/projects/cs2-price-tracker.html`), update the API base URL:

```javascript
// For Cloudflare Tunnel:
const API_BASE_URL = "https://cs2-api.suryapratap.in";

// OR for subdomain approach:
const API_BASE_URL = "https://cs2-api.suryapratap.in";
```

## Security Considerations

1. **Firewall**: Ensure your Raspberry Pi firewall only allows necessary ports:

   ```bash
   sudo ufw allow 22/tcp  # SSH
   sudo ufw allow 80/tcp   # HTTP (if using Nginx)
   sudo ufw allow 443/tcp # HTTPS (if using Nginx)
   sudo ufw enable
   ```

2. **Environment Variables**: Never commit `.env` file. Keep it secure on the Pi.

3. **Rate Limiting**: The application already has rate limiting configured.

4. **CORS**: Only allow requests from your frontend domain.

## Monitoring and Maintenance

### View Logs

```bash
pm2 logs cs2-price-tracker
```

### Restart Application

```bash
pm2 restart cs2-price-tracker
```

### Check Status

```bash
pm2 status
```

### Update Application

```bash
cd ~/cs2-price-tracker
git pull  # or transfer new files
npm install
pm2 restart cs2-price-tracker
```

## Troubleshooting

### Cloudflare Tunnel Issues

- Check tunnel status: `sudo systemctl status cloudflared`
- View logs: `sudo journalctl -u cloudflared -f`
- Test tunnel: `cloudflared tunnel info cs2-api`

### PM2 Issues

- Check logs: `pm2 logs`
- Restart: `pm2 restart all`
- Delete and recreate: `pm2 delete cs2-price-tracker && pm2 start ecosystem.config.js`

### Network Issues

- Test local connection: `curl http://localhost:3001`
- Check if port is listening: `sudo netstat -tlnp | grep 3001`
- Verify firewall: `sudo ufw status`
