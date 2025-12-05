import express from "express";
import Tracker from "../models/tracker.js";
import {
  getSkinPrice,
  getSkinImageUrl
} from "../steam/steam.js";

const router = express.Router();

// Create tracker
router.post("/", async (req, res) => {
  try {
    const {
      skinName,
      interest,
      targetDown,
      targetUp
    } = req.body;
    if (!skinName) {
      res.status(400);
      return res.json({
        error: "skinName required"
      });
    }

    // Try fetch price now to save lastKnownPrice
    let currentPrice = null;
    try {
      const p = await getSkinPrice(skinName);
      currentPrice = p;
    } catch (e) {
      // ignore fetch errors, still allow creation
    }

    // Try fetch image URL
    let imageUrl = null;
    try {
      const imgUrl = await getSkinImageUrl(skinName);
      imageUrl = imgUrl;
    } catch (e) {
      // ignore fetch errors, still allow creation
    }

    const tracker = await Tracker.create({
      skinName,
      interest: interest != null ? interest : "buy",
      targetDown: targetDown != null ? targetDown : null,
      targetUp: targetUp != null ? targetUp : null,
      lastKnownPrice: currentPrice,
      imageUrl: imageUrl
    });

    res.json({
      success: true,
      tracker
    });
  } catch (err) {
    console.error(err);
    res.status(500);
    res.json({
      error: "internal error"
    });
  }
});

// List all trackers
router.get("/", async (req, res) => {
  const query = Tracker.find();
  query.sort({
    createdAt: -1
  });
  const trackers = await query;
  res.json(trackers);
});

// Delete tracker(s)
// Supports: DELETE /track/:id (single ID in URL)
//          DELETE /track with body: { ids: ["id1", "id2", ...] } (multiple IDs)
router.delete("/:id?", async (req, res) => {
  try {
    const ids = req.body.ids;

    if (ids && Array.isArray(ids) && ids.length > 0) {
      // Delete multiple trackers by IDs from request body
      const result = await Tracker.deleteMany({
        _id: {
          $in: ids
        }
      });
      res.json({
        success: true,
        deletedCount: result.deletedCount
      });
    } else if (req.params.id) {
      // Delete single tracker by ID from URL parameter
      await Tracker.findByIdAndDelete(req.params.id);
      res.json({
        success: true
      });
    } else {
      res.status(400);
      res.json({
        error: "Either provide an ID in the URL or an array of IDs in the request body"
      });
    }
  } catch (err) {
    console.error(err);
    res.status(500);
    res.json({
      error: "internal error"
    });
  }
});

export default router;