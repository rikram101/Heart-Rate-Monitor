const mongoose = require("mongoose");
const { Schema } = mongoose;

const deviceSchema = new Schema(
  {
    owner: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    hardwareId: {
      type: String,
      required: true,
      unique: true,  // required for mapping measurements later
      trim: true,
    },
    label: {
      type: String,
      default: "My HeartTrack Device",
    },
    model: {
      type: String,
      default: "HeartTrack v1",
    },
    status: {
      type: String,
      enum: ["ACTIVE", "INACTIVE"],
      default: "ACTIVE",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Device", deviceSchema);