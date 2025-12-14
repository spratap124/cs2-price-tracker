import express from "express";
import Tracker from "../models/tracker.js";
import User from "../models/user.js";
import { getSkinPrice, getSkinImageUrl } from "../steam/steam.js";
import { strictLimiter } from "../middleware/rateLimiter.js";

const router = express.Router();

// Get Trackers
// GET /track?userId=:userId
router.get("/", async (req, res) => {
  try {
    const { userId } = req.query;

    if (!userId) {
      res.status(400);
      return res.json({
        error: "Missing userId parameter"
      });
    }

    const trackers = await Tracker.find({ userId }).sort({ createdAt: -1 });
    res.json(trackers);
  } catch (err) {
    console.error("Error fetching trackers:", err);
    res.status(500);
    res.json({
      error: "Internal server error"
    });
  }
});

// Create tracker
// POST /track
router.post("/", strictLimiter, async (req, res) => {
  try {
    const { userId, skinName, interest, targetDown, targetUp } = req.body;

    if (!userId) {
      res.status(400);
      return res.json({
        error: "userId is required"
      });
    }

    if (!skinName) {
      res.status(400);
      return res.json({
        error: "skinName is required"
      });
    }

    // Verify user exists
    const user = await User.findOne({ userId });
    if (!user) {
      res.status(404);
      return res.json({
        error: "User does not exist"
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
      userId,
      skinName,
      interest: interest != null ? interest : "buy",
      targetDown: targetDown != null ? targetDown : null,
      targetUp: targetUp != null ? targetUp : null,
      lastKnownPrice: currentPrice,
      imageUrl: imageUrl
    });

    res.status(201);
    res.json({
      _id: tracker._id,
      userId: tracker.userId,
      skinName: tracker.skinName,
      interest: tracker.interest,
      targetDown: tracker.targetDown,
      targetUp: tracker.targetUp,
      lastKnownPrice: tracker.lastKnownPrice,
      downAlertSent: tracker.downAlertSent,
      upAlertSent: tracker.upAlertSent,
      createdAt: tracker.createdAt
    });
  } catch (err) {
    console.error("Error creating tracker:", err);
    res.status(500);
    res.json({
      error: "Internal server error"
    });
  }
});

// Delete tracker
// DELETE /track/:trackerId?userId=:userId
router.delete("/:trackerId", strictLimiter, async (req, res) => {
  try {
    const { trackerId } = req.params;
    const { userId } = req.query;

    if (!userId) {
      res.status(400);
      return res.json({
        error: "userId query parameter is required"
      });
    }

    const tracker = await Tracker.findById(trackerId);

    if (!tracker) {
      res.status(404);
      return res.json({
        error: "Tracker does not exist"
      });
    }

    // Verify ownership
    if (tracker.userId !== userId) {
      res.status(403);
      return res.json({
        error: "Tracker does not belong to user"
      });
    }

    await Tracker.findByIdAndDelete(trackerId);
    res.json({
      success: true
    });
  } catch (err) {
    console.error("Error deleting tracker:", err);
    res.status(500);
    res.json({
      error: "Internal server error"
    });
  }
});

export default router;
