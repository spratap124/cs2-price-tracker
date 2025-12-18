# SSH Terminal Performance Troubleshooting Guide

If your SSH terminal is slow when connecting to your Raspberry Pi, this guide will help you diagnose and fix the issue.

## Common Causes

1. **DNS Resolution Delays** - Most common cause
2. **SSH Configuration Issues**
3. **System Resource Constraints** - Cloudflare Tunnel can consume resources
4. **Network Latency**
5. **Terminal Prompt Complexity**
6. **Cloudflare Tunnel Resource Usage** - If using Cloudflare Tunnel proxy

## Quick Fixes

### Fix 1: Disable Reverse DNS Lookups (Most Common Fix)

This is the #1 cause of slow SSH terminals. SSH tries to resolve your client's hostname, which can cause significant delays.

**On your Raspberry Pi, edit the SSH daemon configuration:**

```bash
sudo nano /etc/ssh/sshd_config
```

**Find and modify these lines (or add them if they don't exist):**

```bash
# Disable reverse DNS lookups
UseDNS no

# Disable GSSAPI authentication (can cause delays)
GSSAPIAuthentication no
```

**Save and restart SSH:**

```bash
sudo systemctl restart ssh
```

**Note:** You'll need to reconnect via SSH after this change.

### Fix 2: Optimize SSH Client Configuration

**On your local machine, create or edit `~/.ssh/config`:**

```bash
# For macOS/Linux
nano ~/.ssh/config

# For Windows, edit: C:\Users\YourUsername\.ssh\config
```

**Add these settings for your Raspberry Pi:**

```
Host your-pi-hostname-or-ip
    HostName your-pi-ip-address
    User your-username
    # Disable DNS lookups
    GSSAPIAuthentication no
    # Use faster cipher
    Ciphers aes128-ctr,aes192-ctr,aes256-ctr
    # Compression can help on slow networks
    Compression yes
    # Keep connection alive
    ServerAliveInterval 60
    ServerAliveCountMax 3
```

**Example:**

```
Host pi
    HostName 192.168.1.100
    User thakur-pi
    GSSAPIAuthentication no
    Ciphers aes128-ctr,aes192-ctr,aes256-ctr
    Compression yes
    ServerAliveInterval 60
    ServerAliveCountMax 3
```

Then you can connect with: `ssh pi`

### Fix 3: Check System Resources (Especially with Cloudflare Tunnel)

**On your Raspberry Pi, check system load:**

```bash
# Check CPU usage
top

# Check memory usage
free -h

# Check disk I/O
iostat -x 1

# Check if swap is being used heavily
swapon --show

# Check Cloudflare Tunnel resource usage (if using tunnel)
sudo systemctl status cloudflared
ps aux | grep cloudflared
```

**If resources are constrained:**

- Check Cloudflare Tunnel status - it might be consuming resources
  ```bash
  # Check tunnel logs for errors
  sudo journalctl -u cloudflared -n 50
  
  # Restart tunnel if needed
  sudo systemctl restart cloudflared
  ```
- Stop unnecessary services
- Check if PM2 is using too much memory
- Consider upgrading SD card (slow SD cards can cause issues)
- If Cloudflare Tunnel is using too much CPU/memory, consider:
  - Restarting the tunnel: `sudo systemctl restart cloudflared`
  - Checking for tunnel connection issues
  - Verifying tunnel configuration is correct

### Fix 4: Optimize Terminal Prompt

Complex shell prompts can slow down terminal response. Check your `~/.bashrc` or `~/.zshrc`:

```bash
# Check for complex prompts
cat ~/.bashrc | grep PS1

# If you see complex commands in PS1, consider simplifying
```

### Fix 5: Network Optimization

**Check network latency:**

```bash
# From your local machine, ping the Pi
ping your-pi-ip-address

# Check for packet loss
ping -c 100 your-pi-ip-address
```

**If latency is high:**

- Check Wi-Fi signal strength on the Pi
- Consider using Ethernet instead of Wi-Fi
- Check router performance

## Diagnostic Script

Run the diagnostic script on your Raspberry Pi to identify issues:

```bash
# Download and run the diagnostic script
curl -O https://raw.githubusercontent.com/your-repo/cs2-price-tracker/main/fix-ssh-performance.sh
chmod +x fix-ssh-performance.sh
./fix-ssh-performance.sh
```

Or use the local script:

```bash
chmod +x fix-ssh-performance.sh
./fix-ssh-performance.sh
```

## Manual Diagnostic Steps

### Step 1: Test SSH Connection Speed

**From your local machine:**

```bash
# Time the SSH connection
time ssh your-username@your-pi-ip "echo 'Connected'"
```

**If this takes more than 2-3 seconds, there's a problem.**

### Step 2: Check DNS Resolution

**On your Raspberry Pi:**

```bash
# Test DNS resolution speed
time host your-local-machine-hostname

# If slow, check /etc/resolv.conf
cat /etc/resolv.conf

# Try using faster DNS servers (Google DNS)
echo "nameserver 8.8.8.8" | sudo tee /etc/resolv.conf
echo "nameserver 8.8.4.4" | sudo tee -a /etc/resolv.conf
```

### Step 3: Check SSH Logs

**On your Raspberry Pi:**

```bash
# Check SSH daemon logs for errors
sudo journalctl -u ssh -n 50

# Check for authentication delays
sudo grep -i "slow" /var/log/auth.log
```

### Step 4: Test Without SSH Config

**From your local machine, test with verbose output:**

```bash
ssh -v your-username@your-pi-ip
```

**Look for lines like:**
- `debug1: Authentications that can continue:` - Shows what's being tried
- `debug1: Next authentication method:` - Shows delays
- `debug1: Trying private key:` - Shows key authentication attempts

## Advanced Optimizations

### Enable SSH Connection Multiplexing

**On your local machine, edit `~/.ssh/config`:**

```
Host your-pi-hostname
    ControlMaster auto
    ControlPath ~/.ssh/control-%h-%p-%r
    ControlPersist 10m
```

This allows reusing SSH connections, making subsequent connections much faster.

### Use SSH Keys Instead of Passwords

**Generate SSH key on your local machine:**

```bash
ssh-keygen -t ed25519 -C "your-email@example.com"
```

**Copy to Raspberry Pi:**

```bash
ssh-copy-id your-username@your-pi-ip
```

**Then disable password authentication on Pi (optional, advanced):**

```bash
sudo nano /etc/ssh/sshd_config
# Set: PasswordAuthentication no
sudo systemctl restart ssh
```

## Verification

After applying fixes, test the connection:

```bash
# Time the connection
time ssh your-username@your-pi-ip "echo 'Test'"

# Should complete in < 1 second
```

## Cloudflare Tunnel Specific Considerations

If you're using Cloudflare Tunnel (which you are), here are additional checks:

### Check Tunnel Status and Resource Usage

```bash
# Check if tunnel is running
sudo systemctl status cloudflared

# Check tunnel resource usage
ps aux | grep cloudflared
top -p $(pgrep cloudflared)

# Check tunnel logs for errors
sudo journalctl -u cloudflared -n 100 --no-pager

# Check tunnel connection
cloudflared tunnel info cs2-api
```

### Tunnel-Related Performance Issues

**If Cloudflare Tunnel is consuming too many resources:**

1. **Restart the tunnel:**
   ```bash
   sudo systemctl restart cloudflared
   ```

2. **Check for tunnel connection issues:**
   ```bash
   # View real-time logs
   sudo journalctl -u cloudflared -f
   ```

3. **Verify tunnel configuration:**
   ```bash
   sudo cat /etc/cloudflared/config.yml
   ```

4. **If tunnel keeps reconnecting, it might be causing system load:**
   - Check network stability
   - Verify Cloudflare account status
   - Check for rate limiting issues

**Note:** Cloudflare Tunnel should not directly affect SSH performance, but if it's consuming excessive CPU/memory, it can slow down the entire system including SSH.

## Still Having Issues?

If problems persist:

1. **Check PM2 logs** - High application load might be affecting system performance
   ```bash
   pm2 logs cs2-price-tracker --lines 100
   ```

2. **Check Cloudflare Tunnel** - Tunnel issues can affect system performance
   ```bash
   sudo systemctl status cloudflared
   sudo journalctl -u cloudflared -n 100
   ```

3. **Monitor system resources** during SSH connection
   ```bash
   htop
   # Or
   watch -n 1 'free -h && echo && ps aux | head -20'
   ```

4. **Check for network issues**
   ```bash
   # On Pi
   netstat -i
   ifconfig
   # Check network connections
   ss -tuln
   ```

5. **Consider hardware issues**
   - Slow/failing SD card
   - Insufficient power supply
   - Overheating
   - Network interface issues

## Quick Reference

**Most common fix (apply this first):**

```bash
# On Raspberry Pi
sudo nano /etc/ssh/sshd_config
# Add: UseDNS no
# Add: GSSAPIAuthentication no
sudo systemctl restart ssh
```

**Then reconnect via SSH - should be much faster!**

