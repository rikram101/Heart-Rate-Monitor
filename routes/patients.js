const express = require("express");
const router = express.Router();
const Device = require("../models/device");
const Patient = require("../models/patient");
const Physician = require("../models/physician");
const catchAsync = require("../utils/catchAsync");
const {
  isLoggedIn,
  isDeviceOwner,
  validateDevice,
  isPatient,
  isAssignedPhysician,
} = require("../middleware");

router.use(isLoggedIn, isPatient);

// Show all the devices
router.get(
  "/dashboard",
  catchAsync(async (req, res) => {
    const userDeviceIds = req.user.devices;
    const patient_devices = await Device.find({ _id: { $in: userDeviceIds } });
    res.render("patient/dashboard", {
      patient_devices,
      page_css: null,
      page_script: null,
    });
  })
);

router.get("/account_info", isLoggedIn, isPatient, (req, res) => {
  res.render("patient/account_info", {
    currentUser: req.user,
  });
});

router.post(
  "/accountInfo",
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
    page_css: null,
    page_script: null,
  });
});

router.post(
  "/dashboard",
  validateDevice,
  catchAsync(async (req, res) => {
    // Saving the new device
    const device = new Device(req.body.device);
    await device.save();
    // link new device iD to the logged-in patient
    req.user.devices.push(device._id);
    await req.user.save();
    req.flash("success", "A new Device was added Successfully");
    res.redirect(`/patient/device/${device._id}`);
  })
);

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
    });
  })
);
router.put(
  "/device/:id",
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

module.exports = router;
