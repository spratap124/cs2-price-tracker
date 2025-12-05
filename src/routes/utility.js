import express from "express";
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

export default router;

