#!/bin/bash

# Cloudflare Tunnel Setup Script for Raspberry Pi
# This script helps set up Cloudflare Tunnel for the CS2 Price Tracker API

set -e

echo "========================================="
echo "Cloudflare Tunnel Setup for CS2 API"
echo "========================================="
echo ""

# Check if running as root for certain operations
if [ "$EUID" -ne 0 ]; then 
    echo "Some operations require sudo. Please run with appropriate permissions."
fi

# Detect architecture
ARCH=$(uname -m)
if [ "$ARCH" = "aarch64" ]; then
    CLOUDFLARED_ARCH="arm64"
elif [[ "$ARCH" == arm* ]]; then
    CLOUDFLARED_ARCH="arm"
else
    echo "Unsupported architecture: $ARCH"
    exit 1
fi

echo "Detected architecture: $ARCH ($CLOUDFLARED_ARCH)"
echo ""

# Step 1: Install cloudflared
echo "Step 1: Installing cloudflared..."
if ! command -v cloudflared &> /dev/null; then
    CLOUDFLARED_URL="https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-${CLOUDFLARED_ARCH}"
    sudo curl -L "$CLOUDFLARED_URL" -o /usr/local/bin/cloudflared
    sudo chmod +x /usr/local/bin/cloudflared
    echo "✓ cloudflared installed"
else
    echo "✓ cloudflared already installed"
fi

# Step 2: Create config directory
echo ""
echo "Step 2: Creating configuration directory..."
sudo mkdir -p /etc/cloudflared
echo "✓ Configuration directory created"

# Step 3: Authenticate (interactive)
echo ""
echo "Step 3: Authenticating with Cloudflare..."
echo "This will open a browser window. Please log in and authorize."
read -p "Press Enter to continue..."
cloudflared tunnel login

# Step 4: Create tunnel
echo ""
echo "Step 4: Creating tunnel..."
read -p "Enter a name for your tunnel (e.g., cs2-api): " TUNNEL_NAME
if [ -z "$TUNNEL_NAME" ]; then
    TUNNEL_NAME="cs2-api"
fi

cloudflared tunnel create "$TUNNEL_NAME"

# Get tunnel ID
TUNNEL_ID=$(cloudflared tunnel list | grep "$TUNNEL_NAME" | awk '{print $1}')
if [ -z "$TUNNEL_ID" ]; then
    echo "Error: Could not find tunnel ID. Please check tunnel creation."
    exit 1
fi

echo "✓ Tunnel created with ID: $TUNNEL_ID"

# Step 5: Create config file
echo ""
echo "Step 5: Creating configuration file..."
read -p "Enter subdomain for your API (e.g., cs2-api.suryapratap.in): " HOSTNAME
if [ -z "$HOSTNAME" ]; then
    HOSTNAME="cs2-api.suryapratap.in"
fi

read -p "Enter local port (default: 3001): " LOCAL_PORT
if [ -z "$LOCAL_PORT" ]; then
    LOCAL_PORT="3001"
fi

# Find credentials file
CREDENTIALS_FILE=$(find ~/.cloudflared -name "*.json" -type f | head -n 1)
if [ -z "$CREDENTIALS_FILE" ]; then
    echo "Error: Could not find credentials file. Please check tunnel creation."
    exit 1
fi

# Copy credentials to /etc/cloudflared
sudo cp "$CREDENTIALS_FILE" "/etc/cloudflared/${TUNNEL_ID}.json"
sudo chmod 600 "/etc/cloudflared/${TUNNEL_ID}.json"

# Create config file
sudo tee /etc/cloudflared/config.yml > /dev/null <<EOF
tunnel: $TUNNEL_ID
credentials-file: /etc/cloudflared/${TUNNEL_ID}.json

ingress:
  - hostname: $HOSTNAME
    service: http://localhost:$LOCAL_PORT
  - service: http_status:404
EOF

echo "✓ Configuration file created at /etc/cloudflared/config.yml"

# Step 6: Create DNS route
echo ""
echo "Step 6: Creating DNS route..."
cloudflared tunnel route dns "$TUNNEL_NAME" "$HOSTNAME"
echo "✓ DNS route created"

# Step 7: Install as service
echo ""
echo "Step 7: Installing cloudflared as a system service..."
sudo cloudflared service install
sudo systemctl enable cloudflared
sudo systemctl start cloudflared

echo "✓ Cloudflared service installed and started"

# Step 8: Verify
echo ""
echo "Step 8: Verifying installation..."
sleep 2
sudo systemctl status cloudflared --no-pager

echo ""
echo "========================================="
echo "Setup Complete!"
echo "========================================="
echo ""
echo "Your API should be accessible at: https://$HOSTNAME"
echo ""
echo "Useful commands:"
echo "  - Check status: sudo systemctl status cloudflared"
echo "  - View logs: sudo journalctl -u cloudflared -f"
echo "  - Restart: sudo systemctl restart cloudflared"
echo "  - Stop: sudo systemctl stop cloudflared"
echo ""
