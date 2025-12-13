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
    patient: {
      type: Schema.Types.ObjectId,
      ref: "Patient",
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
      required: false, // you’re already treating it as optional
    },

    // optional for debugging / raw logs
    deviceHardwareId: String,
    raw: Schema.Types.Mixed,
  },
  { timestamps: true }
);

module.exports = mongoose.model("Reading", readingSchema);
