const { deviceSchema } = require("./validate_schema");

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

module.exports.isDeviceOwner = async (req, res, next) => {
  const { id } = req.params;
  const isOwner = req.user.devices.some((deviceId) => deviceId.equals(id));
  if (!isOwner) {
    req.flash("error", "You do not have permission to access this device!");
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
