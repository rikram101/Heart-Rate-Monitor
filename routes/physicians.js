const express = require("express");
const router = express.Router();
const upload = require("./s3Config");
const Patient = require("../models/patient");
const catchAsync = require("../utils/catchAsync");
const {
  isLoggedIn,
  isPhysician,
  validatePhysicianProfile,
  isPatient,
} = require("../middleware");
const Physician = require("../models/physician");
const Reading = require("../models/reading");

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

router
  .route("/complete-profile")
  .get(isLoggedIn, isPhysician, (req, res) => {
    // Render the form. Pass the current user data so fields can be pre-filled (like name).
    res.render("physician/completeProfile", {
      currentUser: req.user,
    });
  })

  // You MUST have this route handler defined in your Express router:
  .post(
    isLoggedIn,
    isPhysician,
    upload.single("image"),
    validatePhysicianProfile,
    catchAsync(async (req, res) => {
      const physicianId = req.user._id;
      const { description, location, image, name } = req.body;

      let imageUrl;
      if (req.file) {
        // aws-s3-multer adds the 'location' property which is the PUBLIC URL
        imageUrl = req.file.location;
      }

      await Physician.findByIdAndUpdate(physicianId, {
        $set: {
          description,
          location,
          name,
          ...(imageUrl && { image: imageUrl }),
        },
      });

      req.flash("success", "Your Profile is complete!");
      res.redirect("/physician/dashboard");
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

// show a particular physician view
router.get(
  "/:id",
  isLoggedIn,
  isPatient,
  catchAsync(async (req, res) => {
    const physician = await Physician.findById(req.params.id);
    if (!physician) {
      req.flash("error", "Cannot find the Physician!");
      return res.redirect("/physicians");
    }
    const patient = await Patient.findById(req.user._id);
    let isChosen = false;
    if (patient && patient.assignedPhysicians) {
      isChosen = patient.assignedPhysicians.some((assignedId) =>
        assignedId.equals(physician._id)
      );
    }
    res.render("physician/show", { physician, isChosen });
  })
);

// View readings for a specific patient (no assignment check yet)
router.get("/patients/:id/readings", isLoggedIn, async (req, res, next) => {
  try {
    const { id } = req.params;

    const patient = await Patient.findById(id);
    if (!patient) {
      req.flash("error", "Patient not found.");
      return res.redirect("/physician/dashboard");
    }

    const rawReadings = await Reading.find({ patient: id })
      .sort({ readingTime: 1 })
      .limit(300)
      .lean();

    const readings = rawReadings.map((r) => ({
      heartRate: Number(r.heartRate),
      spo2: Number(r.spo2),
      readingTime: r.readingTime,
    }));

    res.render("physician/patient_readings", {
      title: `Readings for ${patient.email}`,
      page_css: null,
      page_script: null,
      patient,
      readings,
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
