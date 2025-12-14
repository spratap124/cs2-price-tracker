import express from "express";
import User from "../models/user.js";
import { strictLimiter } from "../middleware/rateLimiter.js";

const router = express.Router();

// Validate Discord webhook URL format
function isValidDiscordWebhook(url) {
  if (!url || typeof url !== "string") {
    return false;
  }
  // Basic validation: should start with https://discord.com/api/webhooks/ or discord.com/api/webhooks/
  const discordWebhookPattern =
    /^https?:\/\/(discord\.com|discordapp\.com)\/api\/webhooks\/\d+\/[a-zA-Z0-9_-]+$/;
  return discordWebhookPattern.test(url);
}

// Create User
// POST /user
router.post("/", strictLimiter, async (req, res) => {
  try {
    const { discordWebhook } = req.body;

    if (!discordWebhook) {
      res.status(400);
      return res.json({
        error: "discordWebhook is required"
      });
    }

    if (!isValidDiscordWebhook(discordWebhook)) {
      res.status(400);
      return res.json({
        error: "Invalid webhook URL"
      });
    }

    const user = await User.create({
      discordWebhook
    });

    res.status(201);
    res.json({
      userId: user.userId,
      discordWebhook: user.discordWebhook,
      createdAt: user.createdAt
    });
  } catch (err) {
    console.error("Error creating user:", err);
    res.status(500);
    res.json({
      error: "Internal server error"
    });
  }
});

// Recover User Account
// POST /user/recover
router.post("/recover", strictLimiter, async (req, res) => {
  try {
    const { discordWebhook } = req.body;

    if (!discordWebhook) {
      res.status(400);
      return res.json({
        error: "discordWebhook is required"
      });
    }

    if (!isValidDiscordWebhook(discordWebhook)) {
      res.status(400);
      return res.json({
        error: "Invalid webhook URL format"
      });
    }

    const user = await User.findOne({ discordWebhook });

    if (!user) {
      res.status(404);
      return res.json({
        error: "No user found with this webhook"
      });
    }

    res.json({
      userId: user.userId,
      discordWebhook: user.discordWebhook,
      createdAt: user.createdAt
    });
  } catch (err) {
    console.error("Error recovering user:", err);
    res.status(500);
    res.json({
      error: "Internal server error"
    });
  }
});

// Get User
// GET /user/:userId
router.get("/:userId", async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await User.findOne({ userId });

    if (!user) {
      res.status(404);
      return res.json({
        error: "User does not exist"
      });
    }

    res.json({
      userId: user.userId,
      discordWebhook: user.discordWebhook,
      createdAt: user.createdAt
    });
  } catch (err) {
    console.error("Error fetching user:", err);
    res.status(500);
    res.json({
      error: "Internal server error"
    });
  }
});

// Update User
// PUT /user/:userId
router.put("/:userId", strictLimiter, async (req, res) => {
  try {
    const { userId } = req.params;
    const { discordWebhook } = req.body;

    if (!discordWebhook) {
      res.status(400);
      return res.json({
        error: "discordWebhook is required"
      });
    }

    if (!isValidDiscordWebhook(discordWebhook)) {
      res.status(400);
      return res.json({
        error: "Invalid webhook URL"
      });
    }

    const user = await User.findOneAndUpdate(
      { userId },
      { discordWebhook, updatedAt: Date.now() },
      { new: true, runValidators: true }
    );

    if (!user) {
      res.status(404);
      return res.json({
        error: "User does not exist"
      });
    }

    res.json({
      userId: user.userId,
      discordWebhook: user.discordWebhook,
      updatedAt: user.updatedAt
    });
  } catch (err) {
    console.error("Error updating user:", err);
    res.status(500);
    res.json({
      error: "Internal server error"
    });
  }
});

export default router;
