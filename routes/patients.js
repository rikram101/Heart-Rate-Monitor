const express = require("express");
const router = express.Router();
const Device = require("../models/device");
const Reading = require("../models/reading");
const catchAsync = require("../utils/catchAsync");
const { isLoggedIn, isDeviceOwner, validateDevice } = require("../middleware");

// Show all the devices
router.get(
  "/dashboard",
  isLoggedIn,
  catchAsync(async (req, res) => {
    const userDeviceIds = req.user.devices;
    const patient_devices = await Device.find({ _id: { $in: userDeviceIds } });
    res.render("patient/dashboard", {
      patient_devices,
      page_css: null,
      page_script: null,
      title: "Dashboard",
    });
  })
);

// Creating/Adding a new device
router.get("/device/new", isLoggedIn, async (req, res) => {
  const device = await Device.findById(req.params.id);
  res.render("patient/new_device", {
    device,
    page_css: null,
    page_script: null,
    title: "About Us",
  });
});

router.post(
  "/dashboard",
  isLoggedIn,
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
    res.redirect(`/patient/device/${device._id}`);
  })
);

// Edit/Update the info present on device
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
    res.render("patient/edit", { device });
  })
);
router.get(
  "/device/:id",
  catchAsync(async (req, res) => {
    const device = await Device.findById(req.params.id);
    if (!device) {
      req.flash("error", "Cannot find that Device!");
      return res.redirect("/patient/dashboard");
    }
    res.render("patient/show_device", {
      device,
      page_css: null,
      page_script: null,
      title: "About Us",
    });
  })
);
router.put(
  "/device/:id",
  isLoggedIn,
  isDeviceOwner,
  validateDevice,
  catchAsync(async (req, res) => {
    const { id } = req.params;
    const device = await Device.findByIdAndUpdate(id, {
      ...req.body.device,
    });
    req.flash("success", "Successfully Updated device Info");
    res.redirect(`/patient/device/${device._id}`);
  })
);

// Delete a particular device
router.delete(
  "/device/:id",
  isLoggedIn,
  isDeviceOwner,
  catchAsync(async (req, res) => {
    const { id } = req.params;
    await Device.findByIdAndDelete(id);
    await req.user.updateOne({ $pull: { devices: id } });
    req.flash("success", "Successfully deleted the device");
    res.redirect("/patient/dashboard");
  })
);

router.get("/readings", isLoggedIn, (req, res) => {
  res.render("patient/readings", {
    title: "My Heart Data",
    page_css: "patient-readings.css",      // optional
    page_script: null                      // we’ll use inline JS to keep it minimal
  });
});

router.get("/readings/data", isLoggedIn, async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, message: "Not authenticated" });
    }

    // Find all devices owned by this patient
    const devices = await Device.find({ owner: req.user._id }).select("_id");
    const deviceIds = devices.map((d) => d._id);

    // Get recent readings for those devices (oldest → newest)
    const readings = await Reading.find({ device: { $in: deviceIds } })
      .sort({ readingTime: 1 })
      .limit(300); // tweak as you like

    res.json({
      success: true,
      readings: readings.map((r) => ({
        heartRate: Number(r.heartRate),
        spo2: Number(r.spo2),
        readingTime: r.readingTime,
      })),
    });
  } catch (err) {
    console.error("Error fetching readings:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});



module.exports = router;
