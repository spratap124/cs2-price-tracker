import mongoose from "mongoose";

const TrackerSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true,
    index: true
  },
  skinName: {
    type: String,
    required: true
  },
  interest: {
    type: String,
    enum: ["buy", "sell", "both"],
    default: "buy"
  },
  targetDown: {
    type: Number,
    default: null
  },
  targetUp: {
    type: Number,
    default: null
  },
  lastKnownPrice: {
    type: Number,
    default: null
  },
  imageUrl: {
    type: String,
    default: null
  },
  iconUrl: {
    type: String,
    default: null
  },
  downAlertSent: {
    type: Boolean,
    default: false
  },
  upAlertSent: {
    type: Boolean,
    default: false
  },
  lastDownAlertPrice: {
    type: Number,
    default: null
  },
  lastUpAlertPrice: {
    type: Number,
    default: null
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Update the updatedAt field before saving
TrackerSchema.pre("save", function (next) {
  this.updatedAt = Date.now();
  next();
});

export default mongoose.model("Tracker", TrackerSchema);
