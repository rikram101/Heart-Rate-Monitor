// models/reading.js
const mongoose = require("mongoose");
const { Schema } = mongoose;

const readingSchema = new Schema(
  {
    device: {
      type: Schema.Types.ObjectId,
      ref: "Device",
      required: true,
    },
    heartRate: {
      type: Number,
      required: true,
      min: 0,
    },
    spo2: {
      type: Number,
      min: 0,
      max: 100,
    },
    readingTime: {
      type: Date,
      required: true, // you’re already treating it as optional
    },

    // optional for debugging / raw logs
    deviceHardwareId: String,
    raw: Schema.Types.Mixed,
  },
  { timestamps: true }
);

// Because we just need the readings for a week and no longer
readingSchema.index(
  { readingTime: 1 },
  { expireAfterSeconds: 8 * 24 * 60 * 60 } // 691200 seconds (8 days)
);

// Standard index for efficient querying by device/time
readingSchema.index({ device: 1, readingTime: -1 });

module.exports = mongoose.model("Reading", readingSchema);
