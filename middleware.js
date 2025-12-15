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
// Ensure you have imported the Patient model and are using the correct paths
// const Patient = require('./path/to/models/patient');

module.exports.canViewDataByPatient = async (req, res, next) => {
  const patientId = req.params.id; // The ID is the Patient ID

  // 1. Find the Target Patient
  // Select fields needed for security check (assignedPhysicians) and for the next step (devices)
  const patient = await Patient.findById(patientId).select(
    "devices assignedPhysicians name"
  );

  if (!patient) {
    req.flash("error", "Patient not found.");
    // Redirect logic remains correct
    const redirectUrl =
      req.user.role === "physician"
        ? "/physician/dashboard"
        : "/patient/dashboard";
    return res.redirect(redirectUrl);
  }

  // 2. CHECK 1: Is the current user the Patient themselves?
  const isPatientOwner =
    req.user.role === "patient" && patient._id.equals(req.user._id);

  // 3. CHECK 2: Is the current user an Assigned Physician?
  const isAssignedPhysician =
    req.user.role === "physician" &&
    patient.assignedPhysicians.some((physicianId) =>
      physicianId.equals(req.user._id)
    );

  if (isPatientOwner || isAssignedPhysician) {
    // 🎉 SUCCESS: Attach the patient object to the request object
    // This allows the controller to use the patient's data immediately.
    req.targetPatient = patient;
    return next();
  }

  // 4. Deny Access
  req.flash(
    "error",
    "You do not have permission to view this patient's device list."
  );
  const redirectUrl =
    req.user.role === "physician"
      ? "/physician/dashboard"
      : "/patient/dashboard";
  return res.redirect(redirectUrl);
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
