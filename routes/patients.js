const express = require("express");
const router = express.Router();
const Device = require("../models/device");
const { isLoggedIn } = require("../middleware");

// Show all the devices
router.get("/dashboard", isLoggedIn, async (req, res) => {
  const userDeviceIds = req.user.devices;
  const patient_devices = await Device.find({ _id: { $in: userDeviceIds } });
  res.render("patient/dashboard", {
    patient_devices,
    page_css: null,
    page_script: null,
    title: "Dashboard",
  });
});

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

router.post("/dashboard", isLoggedIn, async (req, res) => {
  const device = new Device(req.body.device);
  await device.save();
  req.flash("success", "A new Device was added Successfully");
  res.redirect(`/patient/device/${device._id}`);
});

// Edit/Update the info present on device
router.get("/device/:id/edit", async (req, res) => {
  const device = await Device.findById(req.params.id);
  res.render("patient/edit", { device });
});
router.get("/device/:id", async (req, res) => {
  const device = await Device.findById(req.params.id);
  res.render("patient/show_device", {
    device,
    page_css: null,
    page_script: null,
    title: "About Us",
  });
});
router.put("/device/:id", async (req, res) => {
  const { id } = req.params;
  const device = await Device.findByIdAndUpdate(id, {
    ...req.body.device,
  });
  res.redirect(`/patient/device/${device._id}`);
});

// Delete a particular device
router.delete("/device/:id", async (req, res) => {
  const { id } = req.params;
  await Device.findByIdAndDelete(id);
  res.redirect("/patient/dashboard");
});

module.exports = router;
