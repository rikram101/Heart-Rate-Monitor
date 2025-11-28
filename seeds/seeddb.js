const mongoose = require("mongoose");
const Device = require("../models/device");
const { devices: seed_devices } = require("./devices");

mongoose.connect("mongodb://127.0.0.1:27017/heart-rate-monitor", {
  useNewUrlParser: true,
});

const db = mongoose.connection;
db.on("error", console.error.bind(console, "connection error:"));
db.once("open", () => {
  console.log("Database connected");
});

const seed_db = async () => {
  await Device.deleteMany({});
  for (let d of seed_devices) {
    const device = new Device({
      name: d.name,
      serial_number: d.serial_number,
      last_reading_bpm: d.last_reading_bpm,
      last_reading_recorded: d.last_reading_recorded,
      reading_freq: d.reading_frequency_minutes,
    });
    await device.save();
  }
};

seed_db().then(() => {
  mongoose.connection.close();
});
