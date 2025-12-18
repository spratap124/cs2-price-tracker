#!/bin/bash

# SSH Performance Diagnostic and Fix Script for Raspberry Pi
# This script diagnoses and fixes common SSH performance issues

set -e

echo "========================================="
echo "SSH Performance Diagnostic & Fix Script"
echo "========================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if running as root for certain operations
NEEDS_SUDO=false

# Function to print status
print_status() {
    echo -e "${GREEN}✓${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

# Step 1: Check current SSH configuration
echo "Step 1: Checking SSH configuration..."
SSH_CONFIG="/etc/ssh/sshd_config"

if [ -f "$SSH_CONFIG" ]; then
    print_status "SSH config file found"
    
    # Check for UseDNS
    if grep -q "^UseDNS" "$SSH_CONFIG"; then
        if grep -q "^UseDNS no" "$SSH_CONFIG"; then
            print_status "UseDNS is already set to 'no'"
        else
            print_warning "UseDNS is set but not to 'no'"
            NEEDS_SUDO=true
        fi
    else
        print_warning "UseDNS not found in config (will be added)"
        NEEDS_SUDO=true
    fi
    
    # Check for GSSAPIAuthentication
    if grep -q "^GSSAPIAuthentication" "$SSH_CONFIG"; then
        if grep -q "^GSSAPIAuthentication no" "$SSH_CONFIG"; then
            print_status "GSSAPIAuthentication is already set to 'no'"
        else
            print_warning "GSSAPIAuthentication is set but not to 'no'"
            NEEDS_SUDO=true
        fi
    else
        print_warning "GSSAPIAuthentication not found in config (will be added)"
        NEEDS_SUDO=true
    fi
else
    print_error "SSH config file not found at $SSH_CONFIG"
    exit 1
fi

# Step 2: Check Cloudflare Tunnel (if present)
echo ""
echo "Step 2: Checking Cloudflare Tunnel status..."

if systemctl list-units --type=service --state=running | grep -q cloudflared; then
    print_status "Cloudflare Tunnel service is running"
    
    # Check tunnel status
    if systemctl is-active --quiet cloudflared; then
        print_status "Cloudflare Tunnel is active"
        
        # Check resource usage
        TUNNEL_PID=$(pgrep cloudflared | head -n 1)
        if [ -n "$TUNNEL_PID" ]; then
            TUNNEL_CPU=$(ps -p $TUNNEL_PID -o %cpu --no-headers | tr -d ' ')
            TUNNEL_MEM=$(ps -p $TUNNEL_PID -o %mem --no-headers | tr -d ' ')
            print_status "Cloudflare Tunnel CPU: ${TUNNEL_CPU}%, Memory: ${TUNNEL_MEM}%"
            
            # Warn if using too much CPU
            if awk "BEGIN {exit !($TUNNEL_CPU > 50)}"; then
                print_warning "Cloudflare Tunnel is using high CPU (${TUNNEL_CPU}%)"
                echo "  Consider checking tunnel logs: sudo journalctl -u cloudflared -n 50"
            fi
        fi
    else
        print_warning "Cloudflare Tunnel service exists but is not active"
    fi
else
    print_status "Cloudflare Tunnel not detected (this is OK if not using tunnel)"
fi

# Step 3: Check system resources
echo ""
echo "Step 3: Checking system resources..."

# Check CPU load
CPU_LOAD=$(uptime | awk -F'load average:' '{print $2}' | awk '{print $1}' | sed 's/,//')
CPU_CORES=$(nproc)
# Simple comparison without bc
LOAD_THRESHOLD=$(awk "BEGIN {print $CPU_CORES * 2}")

if awk "BEGIN {exit !($CPU_LOAD < $LOAD_THRESHOLD)}"; then
    print_status "CPU load is normal: $CPU_LOAD (cores: $CPU_CORES)"
else
    print_warning "CPU load is high: $CPU_LOAD (cores: $CPU_CORES)"
fi

# Check memory
MEM_INFO=$(free -m | grep Mem)
MEM_TOTAL=$(echo $MEM_INFO | awk '{print $2}')
MEM_USED=$(echo $MEM_INFO | awk '{print $3}')
MEM_PERCENT=$(awk "BEGIN {printf \"%.1f\", ($MEM_USED * 100) / $MEM_TOTAL}")

if awk "BEGIN {exit !($MEM_PERCENT < 90)}"; then
    print_status "Memory usage is normal: ${MEM_PERCENT}% (${MEM_USED}MB / ${MEM_TOTAL}MB)"
else
    print_warning "Memory usage is high: ${MEM_PERCENT}% (${MEM_USED}MB / ${MEM_TOTAL}MB)"
fi

# Check disk I/O (if iostat is available)
if command -v iostat &> /dev/null; then
    print_status "Checking disk I/O..."
    # This would require running iostat, but we'll skip for now
else
    print_warning "iostat not available (install sysstat package to check disk I/O)"
fi

# Step 4: Check DNS resolution
echo ""
echo "Step 4: Testing DNS resolution..."

# Test DNS resolution speed
if command -v host &> /dev/null; then
    START_TIME=$(date +%s%N)
    host google.com > /dev/null 2>&1
    END_TIME=$(date +%s%N)
    DNS_TIME=$(( (END_TIME - START_TIME) / 1000000 ))
    
    if [ $DNS_TIME -lt 100 ]; then
        print_status "DNS resolution is fast: ${DNS_TIME}ms"
    else
        print_warning "DNS resolution is slow: ${DNS_TIME}ms"
        echo "  Consider using faster DNS servers (8.8.8.8, 8.8.4.4)"
    fi
else
    print_warning "host command not available"
fi

# Step 5: Check SSH service status
echo ""
echo "Step 5: Checking SSH service..."

if systemctl is-active --quiet ssh; then
    print_status "SSH service is running"
else
    print_error "SSH service is not running"
    exit 1
fi

# Step 6: Apply fixes
echo ""
echo "Step 6: Applying fixes..."

if [ "$NEEDS_SUDO" = true ]; then
    echo ""
    echo "The following changes need to be made to /etc/ssh/sshd_config:"
    echo "  - Set UseDNS no"
    echo "  - Set GSSAPIAuthentication no"
    echo ""
    read -p "Do you want to apply these fixes? (requires sudo) [y/N]: " APPLY_FIXES
    
    if [ "$APPLY_FIXES" = "y" ] || [ "$APPLY_FIXES" = "Y" ]; then
        # Backup original config
        sudo cp "$SSH_CONFIG" "${SSH_CONFIG}.backup.$(date +%Y%m%d_%H%M%S)"
        print_status "Backup created: ${SSH_CONFIG}.backup.$(date +%Y%m%d_%H%M%S)"
        
        # Apply fixes
        if ! grep -q "^UseDNS" "$SSH_CONFIG"; then
            echo "UseDNS no" | sudo tee -a "$SSH_CONFIG" > /dev/null
            print_status "Added: UseDNS no"
        else
            sudo sed -i 's/^UseDNS.*/UseDNS no/' "$SSH_CONFIG"
            print_status "Updated: UseDNS no"
        fi
        
        if ! grep -q "^GSSAPIAuthentication" "$SSH_CONFIG"; then
            echo "GSSAPIAuthentication no" | sudo tee -a "$SSH_CONFIG" > /dev/null
            print_status "Added: GSSAPIAuthentication no"
        else
            sudo sed -i 's/^GSSAPIAuthentication.*/GSSAPIAuthentication no/' "$SSH_CONFIG"
            print_status "Updated: GSSAPIAuthentication no"
        fi
        
        # Restart SSH service
        echo ""
        echo "Restarting SSH service..."
        sudo systemctl restart ssh
        print_status "SSH service restarted"
        
        echo ""
        print_status "Fixes applied! Please reconnect via SSH to test."
        echo ""
        echo "Note: If you're currently connected via SSH, you may need to reconnect"
        echo "      from a new terminal window to test the improvements."
    else
        echo ""
        print_warning "Fixes not applied. You can apply them manually:"
        echo ""
        echo "  sudo nano /etc/ssh/sshd_config"
        echo "  # Add or modify:"
        echo "  UseDNS no"
        echo "  GSSAPIAuthentication no"
        echo "  sudo systemctl restart ssh"
    fi
else
    print_status "SSH configuration is already optimized!"
fi

# Step 7: Recommendations
echo ""
echo "========================================="
echo "Additional Recommendations"
echo "========================================="
echo ""

if systemctl list-units --type=service --state=running | grep -q cloudflared; then
    echo "Cloudflare Tunnel detected - additional recommendations:"
    echo ""
    echo "1. If SSH is slow and tunnel is using high resources:"
    echo "   sudo systemctl restart cloudflared"
    echo "   sudo journalctl -u cloudflared -n 100"
    echo ""
    echo "2. Check tunnel connection stability:"
    echo "   cloudflared tunnel info cs2-api"
    echo ""
fi

echo "1. Optimize your SSH client config (~/.ssh/config):"
echo "   Host your-pi"
echo "       HostName your-pi-ip"
echo "       User your-username"
echo "       GSSAPIAuthentication no"
echo "       ServerAliveInterval 60"
echo ""

echo "2. Use SSH keys instead of passwords for faster authentication:"
echo "   ssh-keygen -t ed25519"
echo "   ssh-copy-id your-username@your-pi-ip"
echo ""

echo "3. Enable SSH connection multiplexing in ~/.ssh/config:"
echo "   ControlMaster auto"
echo "   ControlPath ~/.ssh/control-%h-%p-%r"
echo "   ControlPersist 10m"
echo ""

echo "4. If DNS is slow, consider using faster DNS servers:"
echo "   echo 'nameserver 8.8.8.8' | sudo tee /etc/resolv.conf"
echo "   echo 'nameserver 8.8.4.4' | sudo tee -a /etc/resolv.conf"
echo ""

echo "========================================="
echo "Diagnostic Complete!"
echo "========================================="

