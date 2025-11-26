const express = require("express");
const router = express.Router();
const passport = require("passport");
const User = require("../models/patient");
const Physician = require("../models/physician");

// Determines which Passport strategy (Patient or Physician) to use
// based on the 'role' selected in the login form.
const authenticateUserOrPhysician = (req, res, next) => {
  // 1. Check for the selected role from the Login form
  const role = req.body.role;

  if (role === "physician") {
    // Authenticate against the Physician model using the physician-specific strategy
    passport.authenticate("physician-local", {
      failureRedirect: "/login",
    })(req, res, next);
  } else {
    // Default to patient (role === 'patient') or any other role, using the patient-specific strategy
    passport.authenticate("patient-local", {
      failureRedirect: "/login",
    })(req, res, next);
  }
};

router.get("/login", (req, res) => {
  res.render("users/login");
});

router.post("/register", async (req, res) => {
  const { email, password, role, deviceId, licenseId } = req.body;

  // User object to upload
  let userDetails = { email };
  // To hold either patient or physician model
  let RegisterModel;
  // For redirection
  let registeredRole;

  if (role === "patient") {
    // for patient use deviceId
    userDetails.deviceId = deviceId;
    RegisterModel = User;
    registeredRole = "patient";
  } else if (role === "physician") {
    // for Physician, use licenseId
    userDetails.licenseId = licenseId;
    RegisterModel = Physician;
    registeredRole = "physician";
  }
  const user = new RegisterModel(userDetails);
  const registered_user = await RegisterModel.register(user, password);
  console.log(registered_user);
  res.redirect("/dashboard");
});

router.post("/login", authenticateUserOrPhysician, (req, res) => {
  // Authentication succeeded. Determine redirect based on the authenticated user's type.
  // We check the model name attached to req.user (provided by Passport).
  res.redirect("/dashboard"); // Fallback
});

module.exports = router;
