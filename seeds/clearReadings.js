const mongoose = require("mongoose");
const Reading = require("../models/reading");

mongoose.connect("mongodb://127.0.0.1:27017/heart-rate-monitor", {
  useNewUrlParser: true,
});

const db = mongoose.connection;
db.on("error", console.error.bind(console, "connection error:"));
db.once("open", () => {
  console.log("Database connected");
});

const clearReadings = async () => {
  try {
    const result = await Reading.deleteMany({});
    console.log(`✓ Deleted ${result.deletedCount} readings from the database`);
  } catch (err) {
    console.error("Error clearing readings:", err);
  }
};

clearReadings().then(() => {
  mongoose.connection.close();
});
