const express = require("express");
const router = express.Router();
const Patient = require("../models/patient");
const catchAsync = require("../utils/catchAsync");
const { isLoggedIn, isPhysician } = require("../middleware");
const Physician = require("../models/physician");

// router.use(isLoggedIn, isPhysician);

// show all the physicians
router.get(
  "/",
  catchAsync(async (req, res) => {
    const physicians = await Physician.find({});
    res.render("physician/physicians", {
      physicians,
      title: "Physicians",
    });
  })
);

// show a particular physician view
router.get(
  "/:id",
  catchAsync(async (req, res) => {
    const physician = await Physician.findById(req.params.id);
    if (!physician) {
      req.flash("error", "Cannot find the Physician!");
      return res.redirect("/physicians");
    }
    res.render("physician/show", { physician });
  })
);

router.get(
  "/dashboard",
  catchAsync(async (req, res) => {
    const patientIds = req.user.patients;
    const patients = await Patient.find({ _id: { $in: patientIds } });
    res.render("physician/dashboard", {
      patients,
      page_css: null,
      page_script: null,
      title: "Dashboard",
    });
  })
);
module.exports = router;
