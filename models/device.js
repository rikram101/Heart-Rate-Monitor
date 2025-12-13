const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const DeviceSchema = new Schema({
    owner: {
      type: Schema.Types.ObjectId,
      ref: "Patient",        // belongs to a Patient
      required: true,
    },
    hardwareId: {
      type: String,
      required: true,
      unique: true,          // Particle device ID
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
  },
  { timestamps: true }
);

module.exports = mongoose.model("Device", DeviceSchema);
