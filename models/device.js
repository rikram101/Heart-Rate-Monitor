const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const DeviceSchema = new Schema(
  {
    hardwareId: {
      type: String,
      required: true,
      unique: true, // Particle device ID
      trim: true,
    },
    label: {
      type: String,
      default: "My HeartTrack Device",
    },
    model: {
      type: String,
      default: "Photon 2",
    },
    firmwareVersion: String,
    isActive: {
      type: Boolean,
      default: true,
    },
    lastSeenAt: Date,
    // for user defined measurement requirements
    measurementConfig: {
      startTime: {
        type: String, // Stored as "HH:MM" (e.g., "08:00")
        default: "06:00",
      },
      endTime: {
        type: String, // Stored as "HH:MM" (e.g., "22:00")
        default: "22:00",
      },
      frequencyMinutes: {
        type: Number, // Interval in minutes (e.g., 30, 60)
        min: 5,
        default: 30,
      },
    },
    lastSuccessfulPost: Date,
  },
  { timestamps: true }
);

module.exports = mongoose.model("Device", DeviceSchema);
