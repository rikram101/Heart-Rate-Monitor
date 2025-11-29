const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const DeviceSchema = new Schema({
  name: {
    type: String,
    required: true,
    default: "Unnamed Device",
  },
  serial_number: { type: String, required: true, unique: true },
  // Additional fields, like last_reading, frequency, etc., go here
  last_reading_bpm: { type: Number },
  last_reading_recorded: { type: Date },
  reading_freq: { type: Number },
});

module.exports = mongoose.model("Device", DeviceSchema);
