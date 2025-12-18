import express from "express";
import axios from "axios";
import os from "os";
import mongoose from "mongoose";
import { getSkinImageUrl } from "../steam/steam.js";

const router = express.Router();

// Get Steam Image
// GET /steam-image?url=:encodedUrl
router.get("/steam-image", async (req, res) => {
  try {
    const { url } = req.query;

    if (!url) {
      res.status(400);
      return res.json({
        error: "url query parameter is required"
      });
    }

    // Decode the URL (Express may have already decoded it, so try decoding)
    let decodedUrl = url;
    try {
      // Try decoding - if it's already decoded, this might throw or return the same
      decodedUrl = decodeURIComponent(url);
    } catch (e) {
      // If decoding fails, assume it's already decoded and use as-is
      decodedUrl = url;
    }

    // Extract skin name from Steam market URL
    // Format: https://steamcommunity.com/market/listings/730/Skin%20Name
    const match = decodedUrl.match(/\/market\/listings\/\d+\/(.+)$/);
    if (!match) {
      res.status(400);
      return res.json({
        error: "Invalid Steam market URL format"
      });
    }

    // Extract and decode the skin name part
    let skinName = match[1];
    try {
      skinName = decodeURIComponent(skinName);
    } catch (e) {
      // If decoding fails, use as-is (might already be decoded)
      skinName = match[1];
    }

    // Get image URL
    const imageUrl = await getSkinImageUrl(skinName);

    if (!imageUrl) {
      res.status(500);
      return res.json({
        error: "Could not retrieve image URL"
      });
    }

    res.json({
      imageUrl
    });
  } catch (err) {
    console.error("Error fetching Steam image:", err);
    res.status(500);
    res.json({
      error: "Internal server error"
    });
  }
});

// Search CS2 Skins
// GET /search-skins?query=:query&start=:start&count=:count
router.get("/search-skins", async (req, res) => {
  try {
    const { query, start, count } = req.query;

    // Validate required query parameter
    if (!query || query.trim() === "") {
      res.status(400);
      return res.json({
        error: "query parameter is required"
      });
    }

    // Parse and validate start parameter (default: 0)
    let startIndex = 0;
    if (start !== undefined) {
      startIndex = parseInt(start, 10);
      if (isNaN(startIndex) || startIndex < 0) {
        res.status(400);
        return res.json({
          error: "start parameter must be a non-negative integer"
        });
      }
    }

    // Parse and validate count parameter (default: 50, max: 100)
    let resultCount = 50;
    if (count !== undefined) {
      resultCount = parseInt(count, 10);
      if (isNaN(resultCount) || resultCount < 1) {
        res.status(400);
        return res.json({
          error: "count parameter must be a positive integer"
        });
      }
      if (resultCount > 100) {
        res.status(400);
        return res.json({
          error: "count parameter cannot exceed 100"
        });
      }
    }

    // Build Steam Market Search API URL
    const steamUrl = `https://steamcommunity.com/market/search/render/?query=${encodeURIComponent(query)}&start=${startIndex}&count=${resultCount}&search_descriptions=0&sort_column=popular&sort_dir=desc&appid=730&norender=1`;

    // Make request to Steam API
    const steamResponse = await axios.get(steamUrl, {
      headers: {
        "User-Agent": process.env.USER_AGENT || "PriceTracker/1.0",
        Accept: "application/json"
      },
      timeout: 10000 // 10 second timeout
    });

    // Check if response is successful
    if (steamResponse.status !== 200) {
      res.status(500);
      return res.json({
        error: "Steam API returned an error"
      });
    }

    // Parse Steam response
    const steamData = steamResponse.data;

    // Steam API returns results in a specific format
    // The response structure: { success: boolean, results: [...], total_count: number }
    if (!steamData || !steamData.success) {
      res.status(500);
      return res.json({
        error: "Steam API request failed or returned invalid data"
      });
    }

    // Transform Steam results to our format
    const results = (steamData.results || []).map(item => {
      // Extract price from sell_price_text or sell_price
      let sellPrice = null;
      let sellPriceText = null;

      // Handle sell_price (could be number in cents or base currency)
      if (item.sell_price !== undefined && item.sell_price !== null) {
        // Steam API might return price in cents, so divide by 100 if it seems too large
        // Typically CS2 skin prices are reasonable (under $1000), so if price > 10000, it's likely in cents
        let price =
          typeof item.sell_price === "number" ? item.sell_price : parseFloat(item.sell_price);
        if (price > 10000) {
          price = price / 100; // Convert from cents
        }
        sellPrice = price;
      }

      // Handle sell_price_text (preferred for display)
      if (item.sell_price_text) {
        sellPriceText = item.sell_price_text;
        // If we don't have sellPrice yet, try to extract it from text
        if (sellPrice === null) {
          const priceMatch = sellPriceText.match(/[\d,]+\.?\d*/);
          if (priceMatch) {
            const priceStr = priceMatch[0].replace(/,/g, "");
            sellPrice = parseFloat(priceStr);
          }
        }
      } else if (sellPrice !== null) {
        // Format as currency text if we have the numeric price but no text
        sellPriceText = `$${sellPrice.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
      }

      // Fallback to sale_price_text if available
      if (!sellPriceText && item.sale_price_text) {
        sellPriceText = item.sale_price_text;
      }

      return {
        name: item.name || item.hash_name || "",
        hash_name: item.hash_name || item.name || "",
        sell_listings: item.sell_listings || 0,
        sell_price: sellPrice,
        sell_price_text: sellPriceText || null,
        app_icon: item.app_icon || null,
        app_name: item.app_name || "Counter-Strike 2",
        asset_description: item.asset_description || null,
        sale_price_text: item.sale_price_text || sellPriceText || null
      };
    });

    // Return formatted response
    res.json({
      results: results,
      total_count: steamData.total_count || results.length
    });
  } catch (err) {
    console.error("Error searching CS2 skins:", err);

    // Handle axios errors
    if (err.response) {
      // Steam API returned an error response
      res.status(500);
      return res.json({
        error: "Steam API unavailable or returned an error"
      });
    } else if (err.request) {
      // Request was made but no response received
      res.status(500);
      return res.json({
        error: "Steam API request timeout or network error"
      });
    } else {
      // Something else happened
      res.status(500);
      return res.json({
        error: "Internal server error"
      });
    }
  }
});

// System Status
// GET /system-status
router.get("/system-status", async (req, res) => {
  try {
    // Get system information
    const systemInfo = {
      hostname: os.hostname(),
      platform: os.platform(),
      arch: os.arch(),
      nodeVersion: process.version,
      uptime: {
        system: Math.floor(os.uptime()),
        process: Math.floor(process.uptime()),
        formatted: {
          system: formatUptime(os.uptime()),
          process: formatUptime(process.uptime())
        }
      },
      memory: {
        total: os.totalmem(),
        free: os.freemem(),
        used: os.totalmem() - os.freemem(),
        usagePercent: ((os.totalmem() - os.freemem()) / os.totalmem() * 100).toFixed(2),
        formatted: {
          total: formatBytes(os.totalmem()),
          free: formatBytes(os.freemem()),
          used: formatBytes(os.totalmem() - os.freemem())
        }
      },
      cpu: {
        cores: os.cpus().length,
        model: os.cpus()[0]?.model || "Unknown",
        loadAverage: os.loadavg()
      },
      network: {
        interfaces: Object.keys(os.networkInterfaces()).reduce((acc, name) => {
          const interfaces = os.networkInterfaces()[name];
          if (interfaces) {
            acc[name] = interfaces
              .filter(iface => iface.family === "IPv4")
              .map(iface => ({
                address: iface.address,
                netmask: iface.netmask,
                mac: iface.mac
              }));
          }
          return acc;
        }, {})
      },
      process: {
        pid: process.pid,
        memoryUsage: {
          rss: process.memoryUsage().rss,
          heapTotal: process.memoryUsage().heapTotal,
          heapUsed: process.memoryUsage().heapUsed,
          external: process.memoryUsage().external,
          formatted: {
            rss: formatBytes(process.memoryUsage().rss),
            heapTotal: formatBytes(process.memoryUsage().heapTotal),
            heapUsed: formatBytes(process.memoryUsage().heapUsed),
            external: formatBytes(process.memoryUsage().external)
          }
        }
      },
      timestamp: new Date().toISOString()
    };

    // Try to get PM2 status if available
    let pm2Status = null;
    try {
      const { execSync } = await import("child_process");
      const pm2List = execSync("pm2 jlist", { encoding: "utf8", timeout: 2000 });
      const pm2Processes = JSON.parse(pm2List);
      const appProcess = pm2Processes.find(p => p.name === "cs2-price-tracker");
      
      if (appProcess) {
        pm2Status = {
          name: appProcess.name,
          status: appProcess.pm2_env?.status || "unknown",
          uptime: appProcess.pm2_env?.pm_uptime || 0,
          restarts: appProcess.pm2_env?.restart_time || 0,
          memory: appProcess.monit?.memory || 0,
          cpu: appProcess.monit?.cpu || 0,
          formatted: {
            uptime: formatUptime((Date.now() - (appProcess.pm2_env?.pm_uptime || 0)) / 1000),
            memory: formatBytes(appProcess.monit?.memory || 0)
          }
        };
      }
    } catch (err) {
      // PM2 not available or error - that's okay
      pm2Status = { error: "PM2 status unavailable" };
    }

    res.json({
      system: systemInfo,
      application: pm2Status,
      health: {
        status: "healthy",
        database: mongoose.connection.readyState === 1 ? "connected" : "disconnected"
      }
    });
  } catch (err) {
    console.error("Error fetching system status:", err);
    res.status(500);
    res.json({
      error: "Internal server error",
      message: err.message
    });
  }
});

// Helper functions
function formatBytes(bytes) {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
}

function formatUptime(seconds) {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  
  if (days > 0) {
    return `${days}d ${hours}h ${minutes}m ${secs}s`;
  } else if (hours > 0) {
    return `${hours}h ${minutes}m ${secs}s`;
  } else if (minutes > 0) {
    return `${minutes}m ${secs}s`;
  } else {
    return `${secs}s`;
  }
}

export default router;
