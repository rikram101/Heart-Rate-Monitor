const { deviceSchema, physicianProfileSchema } = require("./validate_schema");
const ExpressError = require("./utils/ExpressError");
const Patient = require("./models/patient");
const Physician = require("./models/physician");

module.exports.isLoggedIn = (req, res, next) => {
  if (!req.isAuthenticated()) {
    req.session.returnTo = req.originalUrl;
    req.flash("error", "You must be signed in first!");
    return res.redirect("/login");
  }
  next();
};

// to save the returnTo value from the session (req.session.returnTo) to res.locals
module.exports.storeReturnTo = (req, res, next) => {
  if (req.session.returnTo) {
    res.locals.returnTo = req.session.returnTo;
  }
  next();
};

// To check if the curr user is a device owner
module.exports.isDeviceOwner = async (req, res, next) => {
  const { id } = req.params;
  const isOwner = req.user.devices.some((deviceId) => deviceId.equals(id));
  if (!isOwner) {
    req.flash("error", "You do not have permission to access this device!");
    return res.redirect("/patient/dashboard");
  }
  next();
};

// to check if the current user is assigned a particular physician
module.exports.isAssignedPhysician = async (req, res, next) => {
  const { physicianId } = req.params;

  const patient = await Patient.findById(req.user._id);

  if (!patient) {
    req.flash("error", "Patient profile not found.");
    return res.redirect("/login");
  }

  // 2. Check if the physicianId is included in the patient's assignedPhysicians array.
  // Use .some() with .equals() for safe MongoDB ObjectId comparison,
  // similar to how you checked for device ownership.
  const isAssigned = patient.assignedPhysicians.some((assignedId) =>
    assignedId.equals(physicianId)
  );

  if (!isAssigned) {
    req.flash(
      "error",
      "You are not assigned to this physician and cannot view this information."
    );
    return res.redirect("/patient/dashboard");
  }
  next();
};

// Device validation
module.exports.validateDevice = (req, res, next) => {
  const { error } = deviceSchema.validate(req.body);
  if (error) {
    const msg = error.details.map((el) => el.message).join(",");
    throw new ExpressError(msg, 400);
  } else {
    next();
  }
};

// Check if he is a user
module.exports.isPatient = (req, res, next) => {
  // Check if the user is authenticated AND is an instance of the Patient model
  if (req.isAuthenticated() && req.user instanceof Patient) {
    return next();
  }
  req.flash(
    "error",
    "You must be logged in as a patient to access this dashboard."
  );
  return res.redirect("/login");
};

// check if the user is Physician
module.exports.isPhysician = (req, res, next) => {
  // Check if the user is authenticated AND is an instance of the Physician model
  if (req.isAuthenticated() && req.user instanceof Physician) {
    return next();
  }
  req.flash(
    "error",
    "You must be logged in as a physician to access this dashboard."
  );
  return res.redirect("/login");
};

// To validate if either device owner or the assignedPhysician
module.exports.isPatientOrAssignedPhysician = async (req, res, next) => {
  // Assume the Patient ID is passed as 'patientId' or 'id' in params
  const patientId = req.params.patientId || req.params.id;

  if (!patientId) {
    // If the route doesn't require a patient ID, this middleware shouldn't be used,
    // or the logic needs to be simplified.
    req.flash("error", "Resource not found (Missing Patient ID).");
    return res.status(400).redirect("/");
  }

  // --- 1. Check for Direct Patient Ownership (IS THE PATIENT?) ---
  // Check if the current user is the actual patient whose data is being accessed
  if (req.user.role === "patient" && req.user._id.equals(patientId)) {
    console.log("Authorization granted: User is the resource owner (Patient).");
    return next();
  }

  // --- 2. Check for Assigned Physician Status (IS THE ASSIGNED PHYSICIAN?) ---
  if (req.user.role === "physician") {
    // 2a. Find the Target Patient Document
    const targetPatient = await Patient.findById(patientId).select(
      "assignedPhysicians"
    );

    if (!targetPatient) {
      req.flash(
        "error",
        "The patient associated with this resource was not found."
      );
      return res.status(404).redirect("/physician/dashboard");
    }

    // 2b. Check if the current logged-in Physician is assigned to that patient
    const isAssigned = targetPatient.assignedPhysicians.some((assignedId) =>
      assignedId.equals(req.user._id)
    );

    if (isAssigned) {
      console.log("Authorization granted: User is the Assigned Physician.");
      return next();
    }
  }

  // --- 3. Deny Access ---
  req.flash(
    "error",
    "Access denied. You must be the patient or their assigned physician to view this data."
  );
  return res
    .status(403)
    .redirect(
      req.user.role === "physician"
        ? "/physician/dashboard"
        : "/patient/dashboard"
    );
};

// Middleware to validate the physician profile completion data
module.exports.validatePhysicianProfile = (req, res, next) => {
  // We only need the validation function from the schema object
  const { error } = physicianProfileSchema.validate(req.body);
  if (error) {
    // Concatenate all detailed error messages into one string
    const msg = error.details.map((el) => el.message).join(", ");
    req.flash("error", msg);
    return res.redirect("/physician/complete-profile");
  }
  next();
};
