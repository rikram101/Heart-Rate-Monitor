const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const Device = require("../models/device");
const Patient = require("../models/patient");
const Physician = require("../models/physician");
const Reading = require("../models/reading");
const catchAsync = require("../utils/catchAsync");
const {
  isLoggedIn,
  isDeviceOwner,
  validateDevice,
  isPatient,
  isAssignedPhysician,
} = require("../middleware");

router.use(isLoggedIn);

// Show all the devices

// Ensure you have imported Patient, Device, and catchAsync
// const Patient = require('./models/patient');
// const Device = require('./models/device');
// const catchAsync = require('./utils/catchAsync');

router.get(
  "/devices/:id", // <-- This catches the Patient ID from the URL
  catchAsync(async (req, res) => {
    const patientId = req.params.id; // The ID is the Patient ID

    // 1. Find the Target Patient
    // We fetch the patient's name and device IDs
    const patient = await Patient.findById(patientId).select("name devices");

    if (!patient) {
      // If the ID is invalid or the patient doesn't exist
      req.flash("error", "Patient not found.");
      return res.redirect(
        req.user.role === "physician" ? "/physician/dashboard" : "/"
      );
    }

    const deviceIds = patient.devices;

    if (deviceIds.length === 0) {
      req.flash(
        "warning",
        `${patient.name} has no monitoring devices linked yet.`
      );
      return res.redirect(
        req.user.role === "physician" ? "/physician/dashboard" : "/"
      );
    }

    // 2. Fetch the full details for all linked devices
    const devices = await Device.find({ _id: { $in: deviceIds } });

    // 3. Render the view
    res.render("patient/show_device", {
      patient: {
        _id: patient._id,
        name: patient.name,
      },
      devices: devices,
    });
  })
);
router
  .route("/dashboard")
  .get(
    catchAsync(async (req, res) => {
      const userDeviceIds = req.user.devices;
      const patient_devices = await Device.find({
        _id: { $in: userDeviceIds },
      });
      res.render("patient/dashboard", {
        patient_devices,
      });
    })
  )
  .post(
    validateDevice,
    catchAsync(async (req, res) => {
      // Saving the new device with owner set to logged-in patient
      const device = new Device({
        ...req.body.device,
        owner: req.user._id,
      });
      await device.save();
      // link new device ID to the logged-in patient
      req.user.devices.push(device._id);
      await req.user.save();
      req.flash("success", "A new Device was added Successfully");
      res.redirect(`/patient/readings/${device._id}`);
    })
  );

router
  .route("/account_info")
  .get(isLoggedIn, isPatient, (req, res) => {
    res.render("patient/account_info", {
      currentUser: req.user,
    });
  })
  .post(
    isLoggedIn,
    isPatient,
    catchAsync(async (req, res) => {
      const patientId = req.user._id;
      const { name, dob, phone, emergencyContactName, emergencyContactPhone } =
        req.body;

      const updateFields = {
        $set: {
          name,
          dob,
          phone,
          emergencyContactName,
          emergencyContactPhone,
        },
      };

      await Patient.findByIdAndUpdate(patientId, updateFields);

      req.flash(
        "success",
        "Your Account Information has been updated successfully!"
      );
      res.redirect("/patient/dashboard");
    })
  );

// Creating/Adding a new device
router.get("/device/new", async (req, res) => {
  const device = await Device.findById(req.params.id);
  res.render("patient/new_device", {
    device,
  });
});

// Edit/Update the info present on device
router.get(
  "/device/:id/edit",
  isDeviceOwner,
  catchAsync(async (req, res) => {
    const device = await Device.findById(req.params.id);
    if (!device) {
      req.flash("error", "Cannot find that Device!");
      return res.redirect("/patient/dashboard");
    }
    res.render("patient/edit", { device });
  })
);
router.get(
  "/device/:id/edit",
  isLoggedIn,
  isDeviceOwner,
  catchAsync(async (req, res) => {
    const device = await Device.findById(req.params.id);
    if (!device) {
      req.flash("error", "Cannot find that Device!");
      return res.redirect("/patient/dashboard");
    }
    res.render("patient/readings", {
      device,
    });
  })
);
router.put(
  "/device/:id",
  isDeviceOwner,
  validateDevice,
  catchAsync(async (req, res) => {
    const { id } = req.params;
    const { label, isActive, measurementConfig } = req.body.device;
    const updatedDevice = await Device.findByIdAndUpdate(
      id,
      {
        label: label,
        // The checkbox sends 'true' as a string, convert it back to a boolean
        isActive: isActive === "true",

        // Use dot notation for nested updates (measurementConfig)
        "measurementConfig.startTime": measurementConfig.startTime,
        "measurementConfig.endTime": measurementConfig.endTime,
        "measurementConfig.frequencyMinutes":
          measurementConfig.frequencyMinutes,

        // Mongoose option to return the *new* updated document
      },
      { new: true, runValidators: true }
    );
    if (!updatedDevice) {
      req.flash("error", "Device not found for update.");
      return res.redirect("/patient/dashboard");
    }
    req.flash("success", "Successfully Updated device Info");
    res.redirect("/patient/dashboard");
  })
);

// Delete a particular device
router.delete(
  "/device/:id",
  isDeviceOwner,
  catchAsync(async (req, res) => {
    const { id } = req.params;
    await Device.findByIdAndDelete(id);
    await req.user.updateOne({ $pull: { devices: id } });
    req.flash("success", "Successfully deleted the device");
    res.redirect("/patient/dashboard");
  })
);

// choose a physician
router.post(
  "/choose-physician/:physicianId",
  isLoggedIn,
  isPatient,
  catchAsync(async (req, res) => {
    const { physicianId } = req.params;
    const patientId = req.user._id;
    // Update the Patient Document
    await Patient.findByIdAndUpdate(patientId, {
      $addToSet: { assignedPhysicians: physicianId },
    });

    // Update the Physician Document
    const physician = await Physician.findByIdAndUpdate(
      physicianId,
      // $addToSet ensures the patientId is only added if it's not already present
      { $addToSet: { patients: patientId } },
      { new: true } // Ensures the returned 'physician' object is the updated one
    );

    req.flash(
      "success",
      `You have chosen Dr. ${physician.name.split(" ")[1]} as your Physician!`
    );
    res.redirect("/patient/dashboard");
  })
);

router.delete(
  "/remove-physician/:physicianId",
  isLoggedIn,
  isPatient,
  isAssignedPhysician,
  catchAsync(async (req, res) => {
    const { physicianId } = req.params;
    const patientId = req.user._id;
    // Update the Patient Document
    await Patient.findByIdAndUpdate(patientId, {
      $pull: { assignedPhysicians: physicianId },
    });

    // Update the Physician Document
    const physician = await Physician.findByIdAndUpdate(
      physicianId,
      // $addToSet ensures the patientId is only added if it's not already present
      { $pull: { patients: patientId } }
    );

    req.flash(
      "success",
      `Dr. ${
        physician.name.split(" ")[1]
      } successfully removed from your care team.`
    );
    res.redirect("/physician");
  })
);
router.get(
  "/readings/:id",
  isLoggedIn,
  catchAsync(async (req, res) => {
    const deviceId = req.params.id;
    const dateRange = await Reading.aggregate([
      { $match: { device: new mongoose.Types.ObjectId(deviceId) } },
      {
        $group: {
          _id: null,
          // Find the latest date (the new default date)
          latestReadingDate: { $max: "$readingTime" },
          // Find the earliest date
          earliestReadingDate: { $min: "$readingTime" },
        },
      },
    ]);
    // Extract the dates, converting Date objects to simple date strings
    const latestDate =
      dateRange.length > 0 && dateRange[0].latestReadingDate
        ? dateRange[0].latestReadingDate.toISOString().split("T")[0] // 'YYYY-MM-DD'
        : new Date().toISOString().split("T")[0]; // Default to today

    const earliestDate =
      dateRange.length > 0 && dateRange[0].earliestReadingDate
        ? dateRange[0].earliestReadingDate.toISOString().split("T")[0]
        : latestDate;

    res.render("patient/readings", {
      deviceId: deviceId,
      latestReadingDate: latestDate, // Pass the latest date for default
      earliestReadingDate: earliestDate, // Pass the earliest date for the message
    });
  })
);

// router.get("/readings/data", isLoggedIn, async (req, res) => {
//   try {
//     if (!req.user) {
//       return res
//         .status(401)
//         .json({ success: false, message: "Not authenticated" });
//     }

//     // Find all devices owned by this patient
//     const devices = await Device.find({ owner: req.user._id }).select("_id");
//     const deviceIds = devices.map((d) => d._id);

//     // Get recent readings for those devices (oldest → newest)
//     const readings = await Reading.find({ device: { $in: deviceIds } })
//       .sort({ readingTime: 1 })
//       .limit(300); // tweak as you like

//     res.json({
//       success: true,
//       readings: readings.map((r) => ({
//         heartRate: Number(r.heartRate),
//         spo2: Number(r.spo2),
//         readingTime: r.readingTime,
//       })),
//     });
//   } catch (err) {
//     console.error("Error fetching readings:", err);
//     res.status(500).json({ success: false, message: "Server error" });
//   }
// });

// Assuming this is inside a patient-specific router that handles authentication

// Helper to get the start and end of the requested day
function getDateRange(dateString) {
  const start = new Date(dateString);
  start.setHours(0, 0, 0, 0); // Start of day

  const end = new Date(dateString);
  end.setHours(23, 59, 59, 999); // End of day
  return { start, end };
}

// Route 1: Detailed Daily View
router.get(
  "/readings/:id/daily",
  isLoggedIn,
  catchAsync(async (req, res) => {
    const targetDeviceId = req.params.id;
    // Get the date from the query parameter (e.g., ?date=2025-12-12)
    const { date } = req.query;
    if (!date) {
      return res
        .status(400)
        .json({ success: false, message: "Date is required" });
    }

    const { start, end } = getDateRange(date);

    // 1. Find all devices owned by this patient (using the updated schema)
    // The patient model now holds the device IDs.
    const deviceIds = new mongoose.Types.ObjectId(targetDeviceId);

    // 2. Fetch readings for the specific day
    const readings = await Reading.find({
      device: { $in: deviceIds },
      readingTime: { $gte: start, $lte: end },
    }).sort({ readingTime: 1 });

    // 3. Format data into Chart.js {x: time, y: value} pairs
    const hrData = readings.map((r) => ({
      x: r.readingTime, // Chart.js handles the formatting from a Date object
      y: Number(r.heartRate),
    }));

    const spo2Data = readings.map((r) => ({
      x: r.readingTime,
      y: Number(r.spo2),
    }));

    res.json({
      success: true,
      data: { heartRate: hrData, spo2: spo2Data },
    });
  })
);

// Route 2: Weekly Summary View
router.get(
  "/readings/:id/summary",
  isLoggedIn,
  catchAsync(async (req, res) => {
    const targetDeviceId = req.params.id;

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    // 1. Find all device IDs owned by this patient
    const deviceIds = new mongoose.Types.ObjectId(targetDeviceId);
    const deviceIdsArray = [deviceIds];

    // 2. Use MongoDB Aggregation to calculate stats
    const summaryStats = await Reading.aggregate([
      // Stage 1: Filter by patient devices and time window
      {
        $match: {
          device: { $in: deviceIdsArray },
          readingTime: { $gte: sevenDaysAgo },
        },
      },
      // Stage 2: Group all matching documents into one group to calculate overall stats
      {
        $group: {
          _id: null,
          avgHeartRate: { $avg: "$heartRate" },
          minHeartRate: { $min: "$heartRate" },
          maxHeartRate: { $max: "$heartRate" },
          avgSpo2: { $avg: "$spo2" },
          minSpo2: { $min: "$spo2" },
          maxSpo2: { $max: "$spo2" },
        },
      },
    ]);

    // 3. Format and return the result
    const summary = summaryStats[0] || {};

    res.json({
      success: true,
      summary: {
        heartRate: {
          avg: summary.avgHeartRate ? Math.round(summary.avgHeartRate) : 0,
          min: summary.minHeartRate || 0,
          max: summary.maxHeartRate || 0,
        },
        spo2: {
          avg: summary.avgSpo2 ? Math.round(summary.avgSpo2) : 0,
          min: summary.minSpo2 || 0,
          max: summary.maxSpo2 || 0,
        },
      },
    });
  })
);

module.exports = router;
