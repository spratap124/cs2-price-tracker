#!/bin/bash

# Raspberry Pi System Monitoring Script
# Displays system status, resource usage, and application health

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo "========================================="
echo "Raspberry Pi System Monitor"
echo "========================================="
echo ""

# 1. System Information
echo -e "${BLUE}=== System Information ===${NC}"
echo "Hostname: $(hostname)"
echo "Uptime: $(uptime -p)"
echo "Date/Time: $(date)"
echo ""

# 2. CPU Information
echo -e "${BLUE}=== CPU Information ===${NC}"
if [ -f /proc/cpuinfo ]; then
    CPU_MODEL=$(grep -m1 "model name" /proc/cpuinfo | cut -d: -f2 | xargs)
    CPU_CORES=$(grep -c "^processor" /proc/cpuinfo)
    echo "Model: $CPU_MODEL"
    echo "Cores: $CPU_CORES"
fi
CPU_USAGE=$(top -bn1 | grep "Cpu(s)" | sed "s/.*, *\([0-9.]*\)%* id.*/\1/" | awk '{print 100 - $1}')
echo "CPU Usage: ${CPU_USAGE}%"
echo ""

# 3. Memory Information
echo -e "${BLUE}=== Memory Information ===${NC}"
if command -v free &> /dev/null; then
    free -h
else
    # Fallback for systems without free command
    MEM_TOTAL=$(grep MemTotal /proc/meminfo | awk '{print $2}')
    MEM_AVAILABLE=$(grep MemAvailable /proc/meminfo | awk '{print $2}')
    MEM_USED=$((MEM_TOTAL - MEM_AVAILABLE))
    MEM_PERCENT=$((MEM_USED * 100 / MEM_TOTAL))
    echo "Total: $((MEM_TOTAL / 1024)) MB"
    echo "Used: $((MEM_USED / 1024)) MB"
    echo "Available: $((MEM_AVAILABLE / 1024)) MB"
    echo "Usage: ${MEM_PERCENT}%"
fi
echo ""

# 4. Disk Usage
echo -e "${BLUE}=== Disk Usage ===${NC}"
df -h / | tail -1 | awk '{print "Filesystem: " $1}'
df -h / | tail -1 | awk '{print "Total: " $2 " | Used: " $3 " | Available: " $4 " | Usage: " $5}'
echo ""

# 5. Temperature (Raspberry Pi specific)
echo -e "${BLUE}=== Temperature ===${NC}"
if [ -f /sys/class/thermal/thermal_zone0/temp ]; then
    TEMP=$(cat /sys/class/thermal/thermal_zone0/temp)
    TEMP_C=$((TEMP / 1000))
    TEMP_F=$((TEMP_C * 9 / 5 + 32))
    
    if [ $TEMP_C -lt 50 ]; then
        COLOR=$GREEN
    elif [ $TEMP_C -lt 70 ]; then
        COLOR=$YELLOW
    else
        COLOR=$RED
    fi
    
    echo -e "CPU Temperature: ${COLOR}${TEMP_C}°C (${TEMP_F}°F)${NC}"
else
    echo "Temperature: Not available"
fi
echo ""

# 6. Network Information
echo -e "${BLUE}=== Network Information ===${NC}"
if command -v ip &> /dev/null; then
    IP_ADDR=$(ip -4 addr show | grep -oP '(?<=inet\s)\d+(\.\d+){3}' | grep -v '127.0.0.1' | head -1)
    echo "IP Address: ${IP_ADDR:-Not found}"
else
    IP_ADDR=$(hostname -I | awk '{print $1}')
    echo "IP Address: ${IP_ADDR:-Not found}"
fi
echo ""

# 7. PM2 Application Status
echo -e "${BLUE}=== Application Status (PM2) ===${NC}"
if command -v pm2 &> /dev/null; then
    PM2_STATUS=$(pm2 jlist 2>/dev/null || echo "[]")
    if [ "$PM2_STATUS" != "[]" ] && [ -n "$PM2_STATUS" ]; then
        pm2 status
        echo ""
        echo "Application Logs (last 10 lines):"
        pm2 logs cs2-price-tracker --lines 10 --nostream 2>/dev/null || echo "No logs available"
    else
        echo -e "${YELLOW}PM2 is installed but no processes are running${NC}"
    fi
else
    echo -e "${YELLOW}PM2 is not installed${NC}"
fi
echo ""

# 8. Service Status
echo -e "${BLUE}=== Service Status ===${NC}"
if command -v systemctl &> /dev/null; then
    # Check if cloudflared is running
    if systemctl is-active --quiet cloudflared 2>/dev/null; then
        echo -e "Cloudflare Tunnel: ${GREEN}Running${NC}"
    else
        echo -e "Cloudflare Tunnel: ${RED}Not running${NC}"
    fi
    
    # Check if MongoDB is running (if local)
    if systemctl is-active --quiet mongod 2>/dev/null; then
        echo -e "MongoDB: ${GREEN}Running${NC}"
    else
        echo -e "MongoDB: ${YELLOW}Not running (may be using Atlas)${NC}"
    fi
else
    echo "systemctl not available"
fi
echo ""

# 9. Port Status
echo -e "${BLUE}=== Port Status ===${NC}"
if command -v netstat &> /dev/null; then
    if netstat -tlnp 2>/dev/null | grep -q ":3001"; then
        echo -e "Port 3001: ${GREEN}Listening${NC}"
        netstat -tlnp 2>/dev/null | grep ":3001" | head -1
    else
        echo -e "Port 3001: ${RED}Not listening${NC}"
    fi
elif command -v ss &> /dev/null; then
    if ss -tlnp 2>/dev/null | grep -q ":3001"; then
        echo -e "Port 3001: ${GREEN}Listening${NC}"
        ss -tlnp 2>/dev/null | grep ":3001" | head -1
    else
        echo -e "Port 3001: ${RED}Not listening${NC}"
    fi
else
    echo "Network tools not available"
fi
echo ""

# 10. Load Average
echo -e "${BLUE}=== System Load ===${NC}"
if [ -f /proc/loadavg ]; then
    LOAD=$(cat /proc/loadavg)
    echo "Load Average: $LOAD"
    LOAD_1MIN=$(echo $LOAD | awk '{print $1}')
    CPU_CORES=${CPU_CORES:-4}
    LOAD_PERCENT=$(echo "scale=0; ($LOAD_1MIN / $CPU_CORES) * 100" | bc)
    echo "Load Percentage: ${LOAD_PERCENT}%"
else
    uptime
fi
echo ""

# 11. Recent Logs Summary
echo -e "${BLUE}=== Recent Application Activity ===${NC}"
if [ -f "./logs/pm2-out.log" ]; then
    echo "Last 5 log entries:"
    tail -5 ./logs/pm2-out.log 2>/dev/null || echo "No log entries"
elif [ -f "./logs/pm2-error.log" ]; then
    echo "Last 5 error entries:"
    tail -5 ./logs/pm2-error.log 2>/dev/null || echo "No error entries"
else
    echo "Log files not found"
fi
echo ""

echo "========================================="
echo "Monitor complete"
echo "========================================="
echo ""
echo "Quick Commands:"
echo "  - Watch mode: watch -n 5 ./monitor-pi.sh"
echo "  - PM2 logs: pm2 logs cs2-price-tracker"
echo "  - PM2 monitor: pm2 monit"
echo "  - System resources: htop (if installed)"
echo ""

