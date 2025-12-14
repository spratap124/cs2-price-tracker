#!/bin/bash

# Raspberry Pi Setup Script for CS2 Price Tracker
# This script sets up the Node.js environment and PM2 on Raspberry Pi

set -e

echo "========================================="
echo "Raspberry Pi Setup for CS2 Price Tracker"
echo "========================================="
echo ""

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "Node.js not found. Installing Node.js 18.x..."
    curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
    sudo apt-get install -y nodejs
    echo "✓ Node.js installed"
else
    NODE_VERSION=$(node -v)
    echo "✓ Node.js already installed: $NODE_VERSION"
fi

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo "npm not found. Please install Node.js first."
    exit 1
fi

# Install PM2 globally
if ! command -v pm2 &> /dev/null; then
    echo ""
    echo "Installing PM2..."
    sudo npm install -g pm2
    echo "✓ PM2 installed"
else
    echo "✓ PM2 already installed"
fi

# Create logs directory
echo ""
echo "Creating logs directory..."
mkdir -p logs
echo "✓ Logs directory created"

# Install project dependencies
echo ""
echo "Installing project dependencies..."
npm install
echo "✓ Dependencies installed"

# Check for .env file
if [ ! -f .env ]; then
    echo ""
    echo "⚠️  .env file not found!"
    echo "Please create a .env file with the following variables:"
    echo "  MONGODB_URI=your_mongodb_connection_string"
    echo "  PORT=3001"
    echo "  NODE_ENV=production"
    echo ""
    read -p "Do you want to create .env file now? (y/n): " CREATE_ENV
    if [ "$CREATE_ENV" = "y" ]; then
        if [ -f .env.example ]; then
            cp .env.example .env
            echo "✓ .env file created from .env.example"
            echo "Please edit .env and add your MongoDB connection string"
        else
            cat > .env <<EOF
MONGODB_URI=your_mongodb_atlas_connection_string
PORT=3001
NODE_ENV=production
EOF
            echo "✓ .env file created"
            echo "Please edit .env and add your MongoDB connection string"
        fi
    fi
else
    echo "✓ .env file found"
fi

# Setup PM2 startup
echo ""
echo "Setting up PM2 startup..."
STARTUP_CMD=$(pm2 startup | grep -o "sudo.*" || true)
if [ -n "$STARTUP_CMD" ]; then
    echo ""
    echo "⚠️  Please run the following command to enable PM2 on boot:"
    echo "$STARTUP_CMD"
    echo ""
    read -p "Do you want to run it now? (requires sudo password) (y/n): " RUN_STARTUP
    if [ "$RUN_STARTUP" = "y" ]; then
        eval "$STARTUP_CMD"
        echo "✓ PM2 startup configured"
    fi
else
    echo "✓ PM2 startup already configured"
fi

# Start application with PM2
echo ""
echo "Starting application with PM2..."
if pm2 list | grep -q "cs2-price-tracker"; then
    echo "Application already running. Restarting..."
    pm2 restart cs2-price-tracker
else
    pm2 start ecosystem.config.js
    pm2 save
    echo "✓ Application started"
fi

echo ""
echo "========================================="
echo "Setup Complete!"
echo "========================================="
echo ""
echo "Useful PM2 commands:"
echo "  - View logs: pm2 logs cs2-price-tracker"
echo "  - View status: pm2 status"
echo "  - Restart: pm2 restart cs2-price-tracker"
echo "  - Stop: pm2 stop cs2-price-tracker"
echo "  - Monitor: pm2 monit"
echo ""
