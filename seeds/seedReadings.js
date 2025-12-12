const mongoose = require("mongoose");
const Device = require("../models/device");
const Patient = require("../models/patient");
const Reading = require("../models/reading");

mongoose.connect("mongodb://127.0.0.1:27017/heart-rate-monitor", {
  useNewUrlParser: true,
});

const db = mongoose.connection;
db.on("error", console.error.bind(console, "connection error:"));
db.once("open", () => {
  console.log("Database connected");
});

// Generate realistic heart rate with some variation
function generateHeartRate(baseHR = 72, variation = 10) {
  return Math.round(baseHR + (Math.random() - 0.5) * variation * 2);
}

// Generate realistic SpO2 (typically 95-100%)
function generateSpO2(baseSpo2 = 97, variation = 2) {
  return Math.round(Math.min(100, Math.max(90, baseSpo2 + (Math.random() - 0.5) * variation * 2)));
}

const seedReadings = async () => {
  try {
    // Get patient by email (change this to your logged-in email or pass as argument)
    const targetEmail = process.argv[2] || "bob@email.com"; // Default to bob@email.com or pass email as argument
    const patient = await Patient.findOne({ email: targetEmail });
    
    if (!patient) {
      console.log(`No patient found with email: ${targetEmail}`);
      console.log("Available patients:");
      const allPatients = await Patient.find().select("email");
      allPatients.forEach(p => console.log(`  - ${p.email}`));
      return;
    }

    // Find any device (by owner or just the first one)
    let device = await Device.findOne({ owner: patient._id });
    
    // If no device linked to patient, try to link the first available device
    if (!device) {
      device = await Device.findOne();
      if (!device) {
        console.log("No devices found in database. Please create a device first.");
        return;
      }
      
      // Link device to patient
      console.log(`Linking device ${device.hardwareId} to patient ${patient.email}`);
      device.owner = patient._id;
      await device.save();
      
      // Also add to patient's devices array if it exists
      if (patient.devices && !patient.devices.includes(device._id)) {
        patient.devices.push(device._id);
        await patient.save();
      }
    }

    console.log(`Seeding readings for patient: ${patient.email}, device: ${device.hardwareId}`);

    // Clear existing readings for this device
    await Reading.deleteMany({ device: device._id });

    const now = new Date();
    const readings = [];

    // Generate readings over the last 7 days: 5 readings per day
    const days = 7;
    const perDay = 5;
    for (let d = days - 1; d >= 0; d--) {
      // Start of the day 'd' days ago
      const dayStart = new Date(now);
      dayStart.setHours(0, 0, 0, 0);
      dayStart.setDate(dayStart.getDate() - d);

      // Place 5 readings throughout the day (roughly every ~4.8 hours)
      for (let i = 0; i < perDay; i++) {
        const readingTime = new Date(dayStart.getTime() + i * (24 / perDay) * 60 * 60 * 1000);

        // Vary heart rate slightly over time (simulate activity/rest)
        const baseHR = 70 + Math.sin((d * perDay + i) / 5) * 12;
        const heartRate = generateHeartRate(baseHR, 8);

        const spo2 = generateSpO2(97, 2);

        readings.push({
          device: device._id,
          patient: patient._id,
          heartRate,
          spo2,
          readingTime,
          deviceHardwareId: device.hardwareId || device.serial_number,
        });
      }
    }

    await Reading.insertMany(readings);
    console.log(`✓ Successfully seeded ${readings.length} readings`);
    console.log(`  Time range: ${readings[0].readingTime.toLocaleDateString()} to ${readings[readings.length - 1].readingTime.toLocaleDateString()}`);
    console.log(`  Heart rate range: ${Math.min(...readings.map(r => r.heartRate))}-${Math.max(...readings.map(r => r.heartRate))} bpm`);
    console.log(`  SpO2 range: ${Math.min(...readings.map(r => r.spo2))}-${Math.max(...readings.map(r => r.spo2))}%`);
  } catch (err) {
    console.error("Error seeding readings:", err);
  }
};

seedReadings().then(() => {
  mongoose.connection.close();
});
