const mongoose = require("mongoose");
const Patient = require("../models/patient"); // Assuming you have a Patient model
const Physician = require("../models/physician"); // Assuming you have a Physician model
const Device = require("../models/device"); // Assuming you have a Device model
const Reading = require("../models/reading"); // Assuming you have a Reading model

// --- Configuration ---
const DB_URL = "mongodb://127.0.0.1:27017/heart-rate-monitor";
const TEST_PASSWORD = "test"; // 🔥 VERY SHORT PASSWORD FOR TESTING 🔥
// --------------------

// --- Mongoose Connection Setup ---
mongoose.connect(DB_URL, {
  useNewUrlParser: true,
});

const db = mongoose.connection;
db.on("error", console.error.bind(console, "connection error:"));
db.once("open", () => {
  console.log("Database connected");
});
// ---------------------------------

// --- 1. DUMMY DATA STRUCTURES ---

const testPhysicianData = {
  email: "dr.test@clinic.com",
  name: "Dr. Testing Physician",
  description: "Specializes in application debugging and data seeding.",
  location: "Tucson, AZ",
  licenseId: "AZ-DB-99999",
};

const testPatientData = {
  email: "user@test.com",
  name: "Mr. Test Patient",
  dob: new Date("1985-05-15"),
  phone: "555-123-4567",
  emergencyContactName: "Jane Doe",
  emergencyContactPhone: "555-987-6543",
};

// Function to generate a realistic reading
const generateReading = (deviceId, patientId, time, hrBase, spo2Base) => {
  // Add random noise to heart rate (+/- 5 BPM)
  const heartRate = Math.floor(hrBase + (Math.random() - 0.5) * 10);
  // Add random noise to SpO2 (+/- 1%)
  const spo2 = Math.floor(spo2Base + (Math.random() - 0.5) * 2);

  return {
    device: deviceId,
    patient: patientId,
    heartRate: Math.max(50, heartRate), // Min 50 BPM
    spo2: Math.min(100, Math.max(90, spo2)), // Max 100%, Min 90%
    readingTime: time,
  };
};

// --- 2. SEEDING LOGIC ---

const seedDB = async () => {
  // 2.1. CLEAR DATABASE
  console.log(
    "Clearing all existing data (Physicians, Patients, Devices, Readings)..."
  );
  await Physician.deleteMany({});
  await Patient.deleteMany({});
  await Device.deleteMany({});
  await Reading.deleteMany({});
  console.log("Collections cleared.");

  //   // 2.2. CREATE PHYSICIAN
  //   const newPhysician = new Physician(testPhysicianData);
  //   const physician = await Physician.register(newPhysician, TEST_PASSWORD);
  //   console.log(`Physician created: ${physician.name}`);

  //   // 2.3. CREATE PATIENT
  //   const newPatient = new Patient(testPatientData);
  //   const patient = await Patient.register(newPatient, TEST_PASSWORD);
  //   console.log(`Patient created: ${patient.name}`);

  //   // NOTE: We don't save the local 'patient' object here as Passport already did it.

  //   // 2.4. CREATE DEVICES
  //   // 2.4. CREATE DEVICES
  //   const device1 = new Device({
  //     owner: patient._id,
  //     hardwareId: "DEV-HRM-001A",
  //     label: "Wrist Monitor (Left)",
  //     model: "CoreBeat V2",
  //     // 🔥 FIX 1: Add a unique serialNumber
  //     serialNumber: "SN-987654321",
  //     measurementConfig: {
  //       frequencyMinutes: 30,
  //       startTime: "07:00",
  //       endTime: "22:00",
  //     },
  //   });
  //   await device1.save();

  //   const device2 = new Device({
  //     owner: patient._id,
  //     hardwareId: "DEV-SPO2-002B",
  //     label: "Finger Sensor",
  //     model: "OxyTrack V1",
  //     // 🔥 FIX 2: Add a unique serialNumber
  //     serialNumber: "SN-123456789",
  //     measurementConfig: {
  //       frequencyMinutes: 60,
  //       startTime: "00:00",
  //       endTime: "23:59",
  //     },
  //   });
  //   await device2.save();

  //   // ----------------------------------------------------
  //   // 🔥🔥🔥 FIX IMPLEMENTED HERE 🔥🔥🔥
  //   // Explicitly update the Patient document in the database
  //   // using $push to add both device IDs.
  //   // ----------------------------------------------------
  //   const updatedPatient = await Patient.findByIdAndUpdate(
  //     patient._id,
  //     {
  //       $push: {
  //         devices: { $each: [device1._id, device2._id] },
  //         assignedPhysicians: physician._id, // Also link the physician here for simplicity
  //       },
  //     },
  //     { new: true, runValidators: true }
  //   );

  //   // Explicitly update the Physician document to link the Patient
  //   await Physician.findByIdAndUpdate(physician._id, {
  //     $push: { patients: patient._id },
  //   });

  //   console.log(
  //     `Patient ${updatedPatient.name} linked to devices and physician successfully.`
  //   );

  //   // 2.5. GENERATE AND SAVE READINGS (for the last 48 hours)
  //   const allReadings = [];
  //   const now = new Date();
  //   const startTime = new Date(now.getTime() - 48 * 60 * 60 * 1000); // 48 hours ago

  //   let currentTime = new Date(startTime);
  //   let counter = 0;

  //   // Loop through time, generating readings
  //   while (currentTime.getTime() < now.getTime()) {
  //     // Device 1 reading (every 30 mins)
  //     if (
  //       currentTime.getMinutes() % device1.measurementConfig.frequencyMinutes ===
  //       0
  //     ) {
  //       allReadings.push(
  //         generateReading(device1._id, patient._id, new Date(currentTime), 70, 98)
  //       );
  //     }

  //     // Device 2 reading (every 60 mins)
  //     if (currentTime.getMinutes() === 0) {
  //       allReadings.push(
  //         generateReading(device2._id, patient._id, new Date(currentTime), 75, 99)
  //       );
  //     }

  //     // Move time forward by 1 minute
  //     currentTime.setMinutes(currentTime.getMinutes() + 1);
  //     counter++;
  //     if (counter > 5000) break; // Safety break
  //   }

  //   if (allReadings.length > 0) {
  //     await Reading.insertMany(allReadings);
  //     console.log(
  //       `Generated and inserted ${allReadings.length} reading records.`
  //     );
  //   } else {
  //     console.log("No readings generated.");
  //   }

  //   console.log("\n✅ Database Seeding Complete!");
};

// // --- Execution ---
seedDB().then(() => {
  mongoose.connection.close();
  console.log("Database connection closed.");
});
