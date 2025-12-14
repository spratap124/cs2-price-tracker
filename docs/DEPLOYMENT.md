# Deployment Guide for Raspberry Pi 3

This comprehensive guide will help you deploy the CS2 Price Tracker API on a Raspberry Pi 3 and make it securely accessible from the internet using your domain `suryapratap.in`.

## Prerequisites - Detailed Setup Instructions

### 1. Raspberry Pi 3 Setup

#### 1.1 Install Raspberry Pi OS

1. Download **Raspberry Pi Imager** from [raspberrypi.com/software](https://www.raspberrypi.com/software/)
2. Insert a microSD card (minimum 8GB, 16GB+ recommended) into your computer
3. Open Raspberry Pi Imager
4. Click **"Choose OS"** → Select **"Raspberry Pi OS (32-bit)"** (recommended for Pi 3)
5. Click **"Choose Storage"** → Select your microSD card
6. Click the gear icon (⚙️) to configure:
   - Enable SSH: Check **"Enable SSH"**
   - Set username: `thakur-pi` (or your preferred username)
   - Set password: Create a strong password
   - Configure wireless LAN: Enter your Wi-Fi SSID and password
   - Set locale: Choose your timezone
7. Click **"Write"** and wait for the image to be written
8. Eject the microSD card and insert it into your Raspberry Pi 3
9. Power on the Raspberry Pi

#### 1.2 Find Your Raspberry Pi's IP Address

**Option A: From your router**

- Log into your router's admin panel (usually `192.168.1.1` or `192.168.0.1`)
- Look for connected devices and find your Raspberry Pi

**Option B: From the Pi itself (if you have a monitor/keyboard)**

```bash
hostname -I
```

**Option C: Using network scanner**

- Use an app like "Fing" on your phone to scan your network

#### 1.3 Connect via SSH

**On Windows:**

- Use **PuTTY** or **Windows Terminal**
- Open terminal and type: `ssh thakur-pi@<YOUR_PI_IP_ADDRESS>`
- Example: `ssh thakur-pi@192.168.1.100`

**On Mac/Linux:**

```bash
ssh thakur-pi@<YOUR_PI_IP_ADDRESS>
```

**First connection:**

- Type "yes" when prompted about authenticity
- Enter your password when prompted

#### 1.4 Update System Packages

```bash
sudo apt update
sudo apt upgrade -y
sudo reboot
```

Wait for the Pi to reboot, then SSH back in.

### 2. Install Node.js (v20 LTS or higher)

**For Raspberry Pi 3 (ARM32):**

```bash
# Download Node.js v20.x LTS for ARM32
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Verify installation
node --version  # Should show v20.x.x or higher
npm --version   # Should show 10.x.x or higher
```

**If the above doesn't work, use NodeSource's ARM32 repository:**

```bash
# For ARM32 (Raspberry Pi 3)
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs
```

**Alternative: Using Node Version Manager (nvm)**

```bash
# Install nvm
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash

# Reload shell configuration
source ~/.bashrc

# Install Node.js v20 LTS (or latest LTS)
nvm install --lts
# OR specify version explicitly:
# nvm install 20
nvm use --lts
nvm alias default lts/*

# Verify
node --version  # Should show v20.x.x or higher
```

### 3. Set Up MongoDB Atlas (If Not Already Done)

1. **Create MongoDB Atlas Account:**
   - Go to [mongodb.com/cloud/atlas](https://www.mongodb.com/cloud/atlas)
   - Sign up for a free account (M0 Free Tier)

2. **Create a Cluster:**
   - Click **"Build a Database"**
   - Choose **"M0 FREE"** tier
   - Select a cloud provider and region closest to you
   - Click **"Create"**

3. **Create Database User:**
   - Go to **"Database Access"** in the left sidebar
   - Click **"Add New Database User"**
   - Choose **"Password"** authentication
   - Username: Create a username (e.g., `cs2tracker`)
   - Password: Generate a strong password (save it!)
   - Database User Privileges: **"Atlas admin"**
   - Click **"Add User"**

4. **Whitelist IP Address:**
   - Go to **"Network Access"** in the left sidebar
   - Click **"Add IP Address"**
   - Click **"Allow Access from Anywhere"** (for development) or add your Raspberry Pi's public IP
   - Click **"Confirm"**

5. **Get Connection String:**
   - Go to **"Database"** → Click **"Connect"**
   - Choose **"Connect your application"**
   - Driver: **Node.js**, Version: **5.5 or later**
   - Copy the connection string
   - Replace `<password>` with your database user password
   - Replace `<dbname>` with your database name (e.g., `cs2tracker`)
   - Example: `mongodb+srv://cs2tracker:YourPassword@cluster0.xxxxx.mongodb.net/cs2tracker?retryWrites=true&w=majority`

### 4. Set Up Cloudflare Account (For Cloudflare Tunnel Option)

1. **Create Cloudflare Account:**
   - Go to [cloudflare.com](https://www.cloudflare.com)
   - Click **"Sign Up"** (free account is sufficient)
   - Verify your email address

2. **Add Your Domain to Cloudflare:**
   - Log into Cloudflare dashboard
   - Click **"Add a Site"**
   - Enter `suryapratap.in`
   - Select the **Free** plan
   - Cloudflare will scan your existing DNS records
   - **Important:** You'll need to update your nameservers at GoDaddy (see DNS setup below)

### 5. DNS Configuration on GoDaddy

**⚠️ IMPORTANT: If your domain is already hosted elsewhere (e.g., Hostinger):**

If `suryapratap.in` is already hosted on Hostinger or another hosting provider, you have these options:

1. **Use Option 2 (Nginx + Subdomain)** - Recommended if you want to keep your existing Hostinger setup unchanged
   - Keep your existing GoDaddy nameservers (Hostinger will continue working)
   - Just add an A record for `cs2-api.suryapratap.in` pointing to your Raspberry Pi's public IP
   - This won't affect your existing Hostinger hosting

2. **Move domain to Cloudflare** (for Option 1 - Cloudflare Tunnel)
   - Requires changing nameservers to Cloudflare
   - You'll need to reconfigure your Hostinger setup through Cloudflare's DNS
   - More complex but gives you Cloudflare Tunnel benefits

Since your domain is managed on GoDaddy, you have two options:

#### Option A: Use Cloudflare Nameservers (Required for Cloudflare Tunnel)

**⚠️ Warning:** This will change where your DNS is managed. If `suryapratap.in` is currently hosted on Hostinger:

- Your Hostinger site will stop working unless you reconfigure it
- You'll need to add DNS records in Cloudflare to point back to Hostinger
- Consider using **Option B** instead if you want to keep Hostinger unchanged

1. **In Cloudflare Dashboard:**
   - After adding your domain, Cloudflare will show you two nameservers
   - Example: `alice.ns.cloudflare.com` and `bob.ns.cloudflare.com`
   - Copy both nameservers

2. **In GoDaddy:**
   - Log into [godaddy.com](https://www.godaddy.com)
   - Go to **"My Products"** → Click **"DNS"** next to `suryapratap.in`
   - Scroll to **"Nameservers"** section
   - Click **"Change"**
   - Select **"Custom"**
   - Replace the existing nameservers with Cloudflare's nameservers
   - Click **"Save"**
   - **Note:** DNS propagation can take 24-48 hours, but usually happens within a few hours

3. **If moving from Hostinger:**
   - After changing nameservers, you'll need to add DNS records in Cloudflare for your Hostinger site
   - Contact Hostinger support to get the IP address or CNAME for your hosting
   - Add appropriate A/CNAME records in Cloudflare DNS to restore your Hostinger site

#### Option B: Keep GoDaddy Nameservers (Recommended if domain is already hosted)

- Keep your existing GoDaddy nameservers (Hostinger will continue working)
- You'll add DNS records directly in GoDaddy (see Option 2 deployment section)
- This is the safest option if you want to keep your existing hosting unchanged

## Option 1: Cloudflare Tunnel

**⚠️ Note:** This option requires your domain to be in Cloudflare (nameservers changed to Cloudflare). If `suryapratap.in` is currently hosted on Hostinger and you want to keep it unchanged, use **Option 2** instead.

Cloudflare Tunnel creates a secure connection between your Raspberry Pi and Cloudflare's network, allowing you to access your API without exposing your IP address or opening ports on your router.

### Step 1: Install Cloudflared on Raspberry Pi 3

**On your Raspberry Pi (via SSH):**

```bash
# For Raspberry Pi 3 (ARM32 architecture)
# Download to /usr/local/bin (requires sudo)
sudo curl -L https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-arm -o /usr/local/bin/cloudflared

# Make it executable
sudo chmod +x /usr/local/bin/cloudflared

# Verify installation
cloudflared --version
```

**Expected output:** You should see a version number like `cloudflared 2023.x.x`

### Step 2: Authenticate Cloudflared

```bash
cloudflared tunnel login
```

**What happens:**

1. This command will display a URL (e.g., `https://dash.cloudflare.com/argotunnel`)
2. **On your local computer** (not the Pi), open a web browser
3. Copy and paste the URL into your browser
4. Log in with your Cloudflare account credentials
5. Select the domain `suryapratap.in` from the list
6. Click **"Authorize"**
7. You'll see a success message

**On the Raspberry Pi:**

- The command will complete and show "You have successfully logged in"
- A certificate file will be saved at `~/.cloudflared/cert.pem`

### Step 3: Create a Tunnel

```bash
cloudflared tunnel create cs2-api
```

**Expected output:**

```
Created tunnel cs2-api with id <YOUR_TUNNEL_ID>
```

**Important:** Copy the tunnel ID (a long UUID string) - you'll need it in the next step.

### Step 4: Configure the Tunnel

Create the configuration directory:

```bash
sudo mkdir -p /etc/cloudflared
```

Create the configuration file:

```bash
sudo nano /etc/cloudflared/config.yml
```

**Paste the following configuration** (replace `<YOUR_TUNNEL_ID>` with the actual tunnel ID from Step 3):

```yaml
tunnel: <YOUR_TUNNEL_ID>
credentials-file: /home/thakur-pi/.cloudflared/<YOUR_TUNNEL_ID>.json

ingress:
  - hostname: cs2-api.suryapratap.in
    service: http://localhost:3001
  - service: http_status:404
```

**Important:**

- Replace `<YOUR_TUNNEL_ID>` with your actual tunnel ID (e.g., `f5e99327-3ff9-4562-82a6-0e48d5029d2e`)
- The credentials file path uses `thakur-pi` as the username. If your username is different, replace `thakur-pi` with your actual username.

**Save and exit:**

- Press `Ctrl + X`
- Press `Y` to confirm
- Press `Enter` to save

**Verify the credentials file path:**

```bash
ls -la ~/.cloudflared/
```

The credentials file will be named `<YOUR_TUNNEL_ID>.json`. Make sure the path in `config.yml` matches your actual home directory (uses `thakur-pi` by default).

### Step 5: Create DNS Record

```bash
cloudflared tunnel route dns cs2-api cs2-api.suryapratap.in
```

**Expected output:**

```
[INFO] +--------------------------------------------------------------------------------------------+
[INFO] | Your existing DNS records will be updated to use this tunnel. Cloudflare will update      |
[INFO] | DNS records for cs2-api.suryapratap.in to route traffic through this tunnel.              |
[INFO] +--------------------------------------------------------------------------------------------+
```

**Verify in Cloudflare Dashboard:**

1. Go to [dash.cloudflare.com](https://dash.cloudflare.com)
2. Select `suryapratap.in`
3. Go to **"DNS"** → **"Records"**
4. You should see a new CNAME record: `cs2-api` → `<tunnel-id>.cfargotunnel.com`

### Step 6: Install Cloudflared as a System Service

```bash
# Install as a service (this will use the config file at /etc/cloudflared/config.yml)
sudo cloudflared service install

# Enable it to start on boot
sudo systemctl enable cloudflared

# Start the service
sudo systemctl start cloudflared

# Check status
sudo systemctl status cloudflared
```

**Expected status:** Should show `active (running)` in green

**View logs if needed:**

```bash
sudo journalctl -u cloudflared -f
```

### Step 7: Update CORS in server.js

You need to update the CORS configuration to allow requests from your subdomain.

**On your local machine (where you have the code):**

Edit `server.js` and update the `allowedOrigins` array:

```javascript
const allowedOrigins = [
  "https://suryapratap.in",
  "https://cs2-api.suryapratap.in", // Add this line
  "http://192.168.1.11:5173", // Local development
  ...(process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(",") : [])
];
```

**Or add it via environment variable** (recommended):

- Add to your `.env.production` file: `ALLOWED_ORIGINS=https://suryapratap.in,https://cs2-api.suryapratap.in`

### Step 8: Test the Tunnel

**Wait 2-3 minutes for DNS propagation**, then test:

```bash
# Test from your local computer
curl https://cs2-api.suryapratap.in

# Or open in browser
# https://cs2-api.suryapratap.in
```

**Expected:** You should see a response from your API (or an error if the app isn't running yet, which is fine).

## Option 2: Using a Subdomain with Nginx (Alternative)

This option uses Nginx as a reverse proxy and requires you to expose your Raspberry Pi's public IP address. You'll need to configure port forwarding on your router.

### Prerequisites for Option 2

1. **Get Your Public IP Address:**

   ```bash
   curl ifconfig.me
   ```

   Save this IP address - you'll need it for DNS configuration.

2. **Configure Router Port Forwarding:**
   - Log into your router's admin panel
   - Find **"Port Forwarding"** or **"Virtual Server"** settings
   - Add a new rule:
     - **External Port:** 80 (HTTP)
     - **Internal IP:** Your Raspberry Pi's local IP (e.g., `192.168.1.100`)
     - **Internal Port:** 80
     - **Protocol:** TCP
   - Add another rule for HTTPS:
     - **External Port:** 443
     - **Internal IP:** Your Raspberry Pi's local IP
     - **Internal Port:** 443
     - **Protocol:** TCP
   - Save the settings

### Step 1: Set Up Reverse Proxy with Nginx

**On your Raspberry Pi:**

```bash
# Update package list
sudo apt update

# Install Nginx, Certbot, and Python Certbot plugin
sudo apt install -y nginx certbot python3-certbot-nginx

# Check Nginx version
nginx -v

# Start and enable Nginx
sudo systemctl start nginx
sudo systemctl enable nginx

# Check status
sudo systemctl status nginx
```

**Expected:** Nginx should be `active (running)`

**Test:** Open `http://<YOUR_PI_IP>` in a browser - you should see the default Nginx welcome page.

### Step 2: Configure Nginx

Remove the default site (optional):

```bash
sudo rm /etc/nginx/sites-enabled/default
```

Create a new configuration file:

```bash
sudo nano /etc/nginx/sites-available/cs2-api
```

**Paste the following configuration:**

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

        # Increase timeouts for long-running requests
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
}
```

**Save and exit:**

- Press `Ctrl + X`
- Press `Y` to confirm
- Press `Enter`

Enable the site:

```bash
# Create symbolic link
sudo ln -s /etc/nginx/sites-available/cs2-api /etc/nginx/sites-enabled/

# Test configuration for syntax errors
sudo nginx -t
```

**Expected output:**

```
nginx: the configuration file /etc/nginx/nginx.conf syntax is ok
nginx: configuration file /etc/nginx/nginx.conf test is successful
```

Reload Nginx:

```bash
sudo systemctl reload nginx
```

### Step 3: Set Up SSL with Let's Encrypt

**Important:** Before running Certbot, make sure:

1. Your DNS A record is configured (Step 4 below)
2. Port 80 is accessible from the internet (port forwarding configured)
3. DNS has propagated (can take a few minutes to hours)

```bash
# Request SSL certificate
sudo certbot --nginx -d cs2-api.suryapratap.in
```

**During the setup:**

1. Enter your email address (for renewal notifications)
2. Agree to terms of service (type `A` and press Enter)
3. Choose whether to share email (your choice)
4. Certbot will automatically configure Nginx with SSL

**Expected output:**

```
Congratulations! You have successfully enabled https://cs2-api.suryapratap.in
```

**Test automatic renewal:**

```bash
sudo certbot renew --dry-run
```

Certbot automatically sets up renewal, but you can verify it works.

### Step 4: Update DNS in GoDaddy

**In GoDaddy Dashboard:**

1. Log into [godaddy.com](https://www.godaddy.com)
2. Go to **"My Products"**
3. Click **"DNS"** next to `suryapratap.in`
4. Scroll to **"Records"** section
5. Click **"Add"** to create a new record:
   - **Type:** `A`
   - **Name:** `cs2-api` (this creates `cs2-api.suryapratap.in`)
   - **Value:** Your Raspberry Pi's **public IP address** (from `curl ifconfig.me`)
   - **TTL:** `600` (10 minutes) or `3600` (1 hour)
6. Click **"Save"**

**Wait for DNS propagation:**

- DNS changes can take 5 minutes to 48 hours
- Usually takes 15-60 minutes
- Check propagation: [whatsmydns.net](https://www.whatsmydns.net/#A/cs2-api.suryapratap.in)

### Step 5: Update CORS in server.js

Same as Option 1, Step 7 - add `https://cs2-api.suryapratap.in` to allowed origins.

### Step 6: Test the Setup

**After DNS propagates:**

```bash
# Test HTTP (should redirect to HTTPS)
curl http://cs2-api.suryapratap.in

# Test HTTPS
curl https://cs2-api.suryapratap.in

# Or open in browser
# https://cs2-api.suryapratap.in
```

## Setting Up the Node.js Application

### Step 1: Transfer Your Project to Raspberry Pi

**Option A: Using Git (Recommended if your code is in a repository)**

```bash
# Navigate to home directory
cd ~

# Clone your repository
git clone <your-repo-url> cs2-price-tracker

# Navigate into the project
cd cs2-price-tracker
```

**Option B: Using SCP (from your local machine)**

**On your local machine (Mac/Linux):**

```bash
# Navigate to your project directory
cd /path/to/cs2-price-tracker

# Transfer files to Raspberry Pi
scp -r . thakur-pi@<YOUR_PI_IP>:~/cs2-price-tracker
```

**On Windows:**

- Use **WinSCP** or **FileZilla**
- Connect to your Pi via SFTP
- Upload the project folder to `~/cs2-price-tracker` (or `/home/thakur-pi/cs2-price-tracker`)

**Option C: Using USB Drive**

1. Copy project files to a USB drive
2. Insert USB into Raspberry Pi
3. Mount and copy files:

```bash
# Find USB drive (usually /media/thakur-pi/...)
ls /media/thakur-pi/

# Copy files
cp -r /media/thakur-pi/USB_NAME/cs2-price-tracker ~/cs2-price-tracker
cd ~/cs2-price-tracker
```

### Step 2: Install Project Dependencies

**On your Raspberry Pi:**

```bash
# Make sure you're in the project directory
cd ~/cs2-price-tracker

# Install dependencies (this may take 5-10 minutes on Pi 3)
npm install
```

**If you encounter memory issues:**

```bash
# Increase Node.js memory limit
NODE_OPTIONS="--max-old-space-size=512" npm install
```

**Verify installation:**

```bash
# Check if node_modules was created
ls -la node_modules | head -5
```

### Step 3: Set Up Environment Variables

**Create the production environment file:**

```bash
# Create .env.production file
nano .env.production
```

**Paste the following and fill in your values:**

```env
# MongoDB Connection
MONGODB_URI=mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/cs2tracker?retryWrites=true&w=majority

# Server Configuration
PORT=3001
NODE_ENV=production

# CORS Configuration (add your subdomain)
ALLOWED_ORIGINS=https://suryapratap.in,https://cs2-api.suryapratap.in

# Optional: Discord Webhook (if you want alerts)
# DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/...

# Optional: Skinport API (if using)
# SKINPORT_API_KEY=your_api_key_here
# SKINPORT_API_MIN_INTERVAL_MS=37500
```

**Important:**

- Replace `username`, `password`, and the cluster URL with your actual MongoDB Atlas connection string
- Make sure there are no spaces around the `=` sign
- Don't use quotes around values unless necessary

**Save and exit:**

- Press `Ctrl + X`
- Press `Y` to confirm
- Press `Enter`

**Set proper permissions:**

```bash
# Make sure the file is readable only by you
chmod 600 .env.production

# Verify it was created
cat .env.production
```

### Step 4: Create Logs Directory

```bash
# Create logs directory for PM2
mkdir -p logs

# Verify
ls -la logs
```

### Step 5: Test the Application Locally

**Before setting up PM2, test that everything works:**

```bash
# Start the application manually
npm start
```

**Expected output:**

```
✓ Loaded environment from .env.production
Connected to MongoDB Atlas
Server listening on port 3001
```

**Test the API:**

```bash
# In another SSH session or terminal
curl http://localhost:3001
```

**If everything works:**

- Press `Ctrl + C` to stop the server
- Proceed to Step 6

**If you see errors:**

- Check your MongoDB connection string
- Verify your internet connection
- Check the error messages and fix issues

### Step 6: Install PM2 for Process Management

```bash
# Install PM2 globally
sudo npm install -g pm2

# Verify installation
pm2 --version
```

**Expected:** Version number like `5.x.x`

### Step 7: Start the Application with PM2

```bash
# Make sure you're in the project directory
cd ~/cs2-price-tracker

# Start the application using ecosystem.config.js
pm2 start ecosystem.config.js

# Check status
pm2 status
```

**Expected output:**

```
┌─────┬──────────────────────┬─────────┬─────────┬──────────┬─────────┐
│ id  │ name                 │ mode    │ status  │ uptime   │ memory  │
├─────┼──────────────────────┼─────────┼─────────┼──────────┼─────────┤
│ 0   │ cs2-price-tracker    │ fork    │ online  │ 0s       │ 45.2mb  │
└─────┴──────────────────────┴─────────┴─────────┴──────────┴─────────┘
```

**View logs:**

```bash
pm2 logs cs2-price-tracker
```

**Save PM2 configuration:**

```bash
# Save current process list
pm2 save
```

**Set up PM2 to start on boot:**

```bash
# Generate startup script
pm2 startup
```

**Expected output:**

```
[PM2] Init System found: systemd
[PM2] To setup the Startup Script, copy/paste the following command:
sudo env PATH=$PATH:/usr/bin /usr/lib/node_modules/pm2/bin/pm2 startup systemd -u thakur-pi --hp /home/thakur-pi
```

**Run the command shown in the output:**

```bash
# Copy and run the exact command from the output above
# The command will show your actual username and home directory
sudo env PATH=$PATH:/usr/bin /usr/lib/node_modules/pm2/bin/pm2 startup systemd -u thakur-pi --hp /home/thakur-pi
```

**Note:** PM2 will automatically detect your username. If it shows a different username in the output, use that instead.

**Expected output:**

```
[PM2] Startup Script added
```

**Verify it's saved:**

```bash
pm2 save
```

### Step 8: Verify Everything is Running

```bash
# Check PM2 status
pm2 status

# Check application logs
pm2 logs cs2-price-tracker --lines 50

# Test local connection
curl http://localhost:3001

# Check if port is listening
sudo netstat -tlnp | grep 3001
```

**Expected:** You should see the application running and responding to requests.

## Final Verification Steps

### 1. Test API Endpoints

**From your local computer or browser:**

```bash
# Test health/root endpoint
curl https://cs2-api.suryapratap.in

# Test API endpoint (if available)
curl https://cs2-api.suryapratap.in/track
```

**Expected:** JSON response or API data

### 2. Check All Services are Running

**On your Raspberry Pi:**

```bash
# Check PM2
pm2 status

# Check Cloudflare Tunnel (if using Option 1)
sudo systemctl status cloudflared

# Check Nginx (if using Option 2)
sudo systemctl status nginx

# Check all at once
pm2 status && sudo systemctl status cloudflared && sudo systemctl status nginx
```

### 3. Monitor Logs

```bash
# Application logs
pm2 logs cs2-price-tracker --lines 20

# Cloudflare Tunnel logs (if using Option 1)
sudo journalctl -u cloudflared -n 20

# Nginx logs (if using Option 2)
sudo tail -n 20 /var/log/nginx/access.log
sudo tail -n 20 /var/log/nginx/error.log
```

## Updating Your Frontend

**On your Hostinger hosting or wherever your frontend is hosted:**

Update your frontend HTML/JavaScript file (`suryapratap.in/projects/cs2-price-tracker.html` or wherever your frontend code is):

```javascript
// Update the API base URL
const API_BASE_URL = "https://cs2-api.suryapratap.in";

// Example fetch request
fetch(`${API_BASE_URL}/track`)
  .then(response => response.json())
  .then(data => console.log(data));
```

**Test the frontend:**

- Open your website: `https://suryapratap.in/projects/cs2-price-tracker.html`
- Open browser developer tools (F12)
- Check the Network tab for API requests
- Verify requests are going to `https://cs2-api.suryapratap.in`

## Security Considerations

### 1. Configure Firewall

**On your Raspberry Pi:**

```bash
# Install UFW (if not already installed)
sudo apt install ufw

# Allow SSH (IMPORTANT - do this first!)
sudo ufw allow 22/tcp

# For Cloudflare Tunnel (Option 1) - only need SSH
sudo ufw allow 22/tcp
sudo ufw enable

# For Nginx (Option 2) - need HTTP/HTTPS
sudo ufw allow 22/tcp   # SSH
sudo ufw allow 80/tcp   # HTTP
sudo ufw allow 443/tcp  # HTTPS
sudo ufw enable

# Check status
sudo ufw status
```

**Important:** Always allow SSH (port 22) before enabling the firewall, or you'll lock yourself out!

### 2. Secure Environment Variables

```bash
# Make sure .env files are not readable by others
chmod 600 .env.production
chmod 600 .env

# Verify permissions
ls -la .env*
```

### 3. Change Default SSH Password

```bash
# Change password for thakur-pi user
passwd

# Or create a new user with sudo privileges
sudo adduser yourusername
sudo usermod -aG sudo yourusername
```

### 4. Disable SSH Password Authentication (Advanced - Optional)

**Only do this if you have SSH key authentication set up:**

```bash
sudo nano /etc/ssh/sshd_config
```

Set:

```
PasswordAuthentication no
PubkeyAuthentication yes
```

Then:

```bash
sudo systemctl restart ssh
```

### 5. Keep System Updated

```bash
# Update regularly
sudo apt update
sudo apt upgrade -y

# Set up automatic security updates (optional)
sudo apt install unattended-upgrades
sudo dpkg-reconfigure -plow unattended-upgrades
```

### 6. Rate Limiting

The application already has rate limiting configured. You can adjust it in the code if needed.

### 7. CORS Configuration

Make sure only your frontend domain is allowed. Check `server.js` for the `allowedOrigins` array.

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

### Application Won't Start

**Problem:** `pm2 status` shows `errored` or `stopped`

**Solutions:**

```bash
# Check detailed logs
pm2 logs cs2-price-tracker --lines 100

# Common issues:
# 1. MongoDB connection failed
#    - Check MONGODB_URI in .env.production
#    - Verify MongoDB Atlas IP whitelist includes your Pi's IP
#    - Test connection: curl your-mongodb-uri

# 2. Port already in use
#    - Check what's using port 3001
sudo lsof -i :3001
#    - Kill the process or change PORT in .env.production

# 3. Missing dependencies
cd ~/cs2-price-tracker
npm install

# 4. Memory issues (common on Pi 3)
#    - Check available memory
free -h
#    - If low, close other applications or add swap space
```

### Cloudflare Tunnel Issues

**Problem:** Tunnel not connecting

**Solutions:**

```bash
# Check tunnel status
sudo systemctl status cloudflared

# View real-time logs
sudo journalctl -u cloudflared -f

# Check tunnel info
cloudflared tunnel info cs2-api

# Restart tunnel
sudo systemctl restart cloudflared

# Verify configuration
sudo cat /etc/cloudflared/config.yml

# Test tunnel manually (stops service first)
sudo systemctl stop cloudflared
cloudflared tunnel run cs2-api
# Press Ctrl+C to stop, then restart service
sudo systemctl start cloudflared
```

**Common Issues:**

- **"Tunnel not found"**: Re-run `cloudflared tunnel create cs2-api`
- **"Credentials file not found"**: Check path in config.yml matches actual file location
- **"DNS record not found"**: Run `cloudflared tunnel route dns cs2-api cs2-api.suryapratap.in` again

### PM2 Issues

**Problem:** Application crashes or won't stay running

**Solutions:**

```bash
# View all logs
pm2 logs cs2-price-tracker --lines 200

# Check process details
pm2 describe cs2-price-tracker

# Restart application
pm2 restart cs2-price-tracker

# Delete and recreate
pm2 delete cs2-price-tracker
cd ~/cs2-price-tracker
pm2 start ecosystem.config.js
pm2 save

# Check memory usage
pm2 monit

# If out of memory, restart Pi
sudo reboot
```

**Problem:** PM2 not starting on boot

**Solutions:**

```bash
# Re-run startup command
pm2 startup
# Copy and run the sudo command shown

# Verify startup script
sudo systemctl status pm2-thakur-pi

# Manually save process list
pm2 save
```

### Network Issues

**Problem:** Can't access API from internet

**Solutions:**

```bash
# Test local connection first
curl http://localhost:3001

# Check if port is listening
sudo netstat -tlnp | grep 3001
# OR
sudo ss -tlnp | grep 3001

# Check firewall
sudo ufw status verbose

# For Option 2 (Nginx): Check Nginx status
sudo systemctl status nginx
sudo nginx -t

# Test DNS resolution
nslookup cs2-api.suryapratap.in
dig cs2-api.suryapratap.in

# Check your public IP
curl ifconfig.me
```

**Problem:** DNS not resolving

**Solutions:**

- **For Cloudflare Tunnel:** Wait 5-15 minutes for DNS propagation
- **For GoDaddy DNS:** Can take up to 48 hours, usually 15-60 minutes
- Check DNS propagation: [whatsmydns.net](https://www.whatsmydns.net/#A/cs2-api.suryapratap.in)
- Verify DNS records in Cloudflare/GoDaddy dashboard

### MongoDB Connection Issues

**Problem:** "MongooseError: connect ECONNREFUSED" or connection timeout

**Solutions:**

```bash
# Test MongoDB connection string
# Replace with your actual connection string
mongosh "your-connection-string"

# Check if MongoDB Atlas IP whitelist includes:
# 1. Your Raspberry Pi's public IP (curl ifconfig.me)
# 2. Or 0.0.0.0/0 for development (less secure)

# Verify MONGODB_URI in .env.production
cat .env.production | grep MONGODB_URI

# Test from Node.js
node -e "require('mongoose').connect(process.env.MONGODB_URI).then(() => console.log('Connected')).catch(e => console.error(e))"
```

### Performance Issues on Raspberry Pi 3

**Problem:** Application is slow or crashes due to memory

**Solutions:**

```bash
# Check memory usage
free -h
pm2 monit

# Add swap space (helps with memory issues)
sudo dphys-swapfile swapoff
sudo nano /etc/dphys-swapfile
# Change CONF_SWAPSIZE=100 to CONF_SWAPSIZE=1024
sudo dphys-swapfile setup
sudo dphys-swapfile swapon

# Reduce PM2 memory limit in ecosystem.config.js
# Change max_memory_restart from "500M" to "300M"

# Close unnecessary services
sudo systemctl list-units --type=service --state=running
# Disable services you don't need
```

### SSL Certificate Issues (Option 2)

**Problem:** Certbot fails or certificate expired

**Solutions:**

```bash
# Renew certificate manually
sudo certbot renew

# Check certificate expiration
sudo certbot certificates

# Re-run certbot if initial setup failed
sudo certbot --nginx -d cs2-api.suryapratap.in --force-renewal

# Check Nginx SSL configuration
sudo cat /etc/nginx/sites-available/cs2-api
```

### General Debugging Commands

```bash
# Check system resources
htop
# OR
top

# Check disk space
df -h

# Check system logs
sudo journalctl -xe

# Check recent system errors
sudo dmesg | tail -20

# Reboot if needed
sudo reboot
```

### Getting Help

If you're stuck:

1. Check all logs: `pm2 logs`, `sudo journalctl -u cloudflared`, `sudo journalctl -u nginx`
2. Verify each step was completed correctly
3. Check that all services are running: `pm2 status`, `sudo systemctl status cloudflared`
4. Test locally first: `curl http://localhost:3001`
5. Verify DNS has propagated: [whatsmydns.net](https://www.whatsmydns.net)

## Quick Reference Checklist

Use this checklist to track your deployment progress:

### Prerequisites

- [ ] Raspberry Pi 3 set up with Raspberry Pi OS
- [ ] Raspberry Pi connected to network and accessible via SSH
- [ ] Node.js v20 LTS or higher installed (`node --version`)
- [ ] MongoDB Atlas account created
- [ ] MongoDB Atlas cluster created and connection string obtained
- [ ] MongoDB Atlas IP whitelist configured (include Pi's public IP or 0.0.0.0/0)
- [ ] Cloudflare account created (for Option 1)
- [ ] Domain `suryapratap.in` added to Cloudflare (for Option 1)
- [ ] GoDaddy DNS access configured

### Option 1: Cloudflare Tunnel

- [ ] Cloudflared installed on Raspberry Pi
- [ ] Cloudflared authenticated (`cloudflared tunnel login`)
- [ ] Tunnel created (`cloudflared tunnel create cs2-api`)
- [ ] Tunnel configuration file created at `/etc/cloudflared/config.yml`
- [ ] DNS record created (`cloudflared tunnel route dns`)
- [ ] Cloudflared service installed and running
- [ ] CORS updated in `server.js` or `.env.production`

### Option 2: Nginx + Subdomain

- [ ] Public IP address obtained (`curl ifconfig.me`)
- [ ] Router port forwarding configured (ports 80 and 443)
- [ ] Nginx installed and running
- [ ] Nginx configuration file created
- [ ] SSL certificate obtained via Certbot
- [ ] DNS A record added in GoDaddy
- [ ] CORS updated in `server.js` or `.env.production`

### Application Setup

- [ ] Project files transferred to Raspberry Pi
- [ ] Dependencies installed (`npm install`)
- [ ] `.env.production` file created with all required variables
- [ ] Logs directory created
- [ ] Application tested locally (`npm start`)
- [ ] PM2 installed globally
- [ ] Application started with PM2
- [ ] PM2 configured to start on boot

### Verification

- [ ] Application responds locally (`curl http://localhost:3001`)
- [ ] Application accessible via subdomain (`curl https://cs2-api.suryapratap.in`)
- [ ] Frontend updated with new API URL
- [ ] Frontend can successfully call API endpoints
- [ ] All services running (`pm2 status`, `sudo systemctl status cloudflared/nginx`)

### Security

- [ ] Firewall configured (UFW)
- [ ] Environment files secured (`chmod 600 .env.production`)
- [ ] SSH password changed (or SSH keys configured)
- [ ] System updates applied

### Maintenance Commands Reference

```bash
# Application Management
pm2 status                    # Check application status
pm2 logs cs2-price-tracker    # View application logs
pm2 restart cs2-price-tracker # Restart application
pm2 monit                     # Monitor resources

# Cloudflare Tunnel (Option 1)
sudo systemctl status cloudflared    # Check tunnel status
sudo journalctl -u cloudflared -f    # View tunnel logs
sudo systemctl restart cloudflared   # Restart tunnel

# Nginx (Option 2)
sudo systemctl status nginx          # Check Nginx status
sudo nginx -t                        # Test Nginx configuration
sudo systemctl restart nginx        # Restart Nginx
sudo certbot renew                   # Renew SSL certificate

# System
sudo apt update && sudo apt upgrade  # Update system
free -h                              # Check memory
df -h                                # Check disk space
sudo reboot                          # Reboot Raspberry Pi
```

## Summary

You now have a complete deployment guide for your CS2 Price Tracker API on Raspberry Pi 3. The guide covers:

1. **Detailed Prerequisites** - Step-by-step setup for all required services
2. **Two Deployment Options:**
   - **Option 1:** Cloudflare Tunnel (recommended, no port forwarding needed)
   - **Option 2:** Nginx with subdomain (requires port forwarding)
3. **Complete Application Setup** - From transferring files to running with PM2
4. **Security Best Practices** - Firewall, environment variables, SSH security
5. **Comprehensive Troubleshooting** - Solutions for common issues
6. **Quick Reference** - Checklist and command reference

**Recommended Path for Your Setup:**
Since you own `suryapratap.in` and manage DNS on GoDaddy:

- **If `suryapratap.in` is NOT currently hosted elsewhere:** Use **Option 1 (Cloudflare Tunnel)** because:
  - No need to configure router port forwarding
  - More secure (no exposed ports)
  - Easier to set up
  - Free SSL certificate included
  - Works behind any firewall/NAT

- **If `suryapratap.in` IS already hosted (e.g., on Hostinger):** Use **Option 2 (Nginx + Subdomain)** because:
  - Keep your existing hosting unchanged (no nameserver changes needed)
  - Just add an A record for `cs2-api.suryapratap.in` in GoDaddy
  - Your existing Hostinger site continues working normally
  - Requires router port forwarding (ports 80 and 443)
  - Uses Let's Encrypt for free SSL certificates

**Next Steps:**

1. Complete the Prerequisites section
2. Choose Option 1 or Option 2
3. Follow the steps in order
4. Use the checklist to track progress
5. Refer to Troubleshooting if you encounter issues

Good luck with your deployment! 🚀
