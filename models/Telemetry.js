const mongoose = require("mongoose");
const { Schema } = mongoose;

const telemetrySchema = new Schema(
  {
    device: {
      type: Schema.Types.ObjectId,
      ref: "Device",
      required: false,
    },
    hardwareId: {
      type: String,
      required: true,
      index: true,
      trim: true,
    },
    heartRate: {
      type: Number,
      min: 0,
      max: 300,
    },
    spo2: {
      type: Number,
      min: 0,
      max: 100,
    },
    payload: {
      type: Schema.Types.Mixed,
    },
    receivedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Telemetry", telemetrySchema);
