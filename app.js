const express = require("express");
const path = require("path");
const session = require("express-session");
const passport = require("passport");
const LocalStrategy = require("passport-local");
const ejsMate = require("ejs-mate");
const methodOverried = require("method-override");

const app = express();

// Routes
const userRoutes = require("./routes/users");

// To run mongoose.connect() code from db.js
require("./db");

// Set the engine to use ejs-mate instead of the normal engine that is used to parse ejs
app.engine("ejs", ejsMate);
// Telling express to use ejs as the templating engine
app.set("view engine", "ejs");
// Setting the directory for ejs templates
app.set("views", path.join(__dirname, "views"));
app.use(express.static("public"));

// For express to parse from req data
app.use(express.urlencoded({ extended: true }));
app.use(methodOverried("_method"));

const Physician = require("./models/physician");
const Patient = require("./models/patient");
const Device = require("./models/device");

// The session
const sessionConfig = {
  secret: "thisshouldbeabettersecret!",
  resave: false,
  saveUninitialized: true,
  cookie: {
    httpOnly: true,
    expires: Date.now() + 1000 * 60 * 60 * 24 * 7,
    maxAge: 1000 * 60 * 60 * 24 * 7,
  },
};

// This should be befoer passport session initialisation
app.use(session(sessionConfig));

// Pasport Middlewares
app.use(passport.initialize());
app.use(passport.session());
// authenticate method is from passport
passport.use(
  "patient-local",
  new LocalStrategy(
    {
      // This tells Passport to look for req.body.email
      // Because we have set out username as email in schema and passport under the hood looks for username while authenticating
      usernameField: "email",
    },
    Patient.authenticate()
  )
);
passport.use(
  "physician-local",
  new LocalStrategy(
    {
      usernameField: "email",
    },
    Physician.authenticate()
  )
);

// How to store user in the session
passport.serializeUser(Patient.serializeUser());
// How to get user out of the session
passport.deserializeUser(Patient.deserializeUser());

app.use("/", userRoutes);

app.get("/", (req, res) => {
  res.render("home", {
    page_css: "home.css", // Pass the name of the stylesheet file
    page_script: "home.js",
    title: "Core-Beat Home",
  });
});

app.get("/dashboard", async (req, res) => {
  const patient_devices = await Device.find({});
  res.render("patient/dashboard", {
    patient_devices,
    page_css: null,
    page_script: null,
    title: "About Us",
  });
});

app.get("/device/new", async (req, res) => {
  const device = await Device.findById(req.params.id);
  res.render("patient/new_device", {
    device,
    page_css: null,
    page_script: null,
    title: "About Us",
  });
});

app.post("/dashboard", async (req, res) => {
  const device = new Device(req.body.device);
  await device.save();
  res.redirect(`/device/${device._id}`);
});

app.get("/device/:id/edit", async (req, res) => {
  const device = await Device.findById(req.params.id);
  res.render("patient/edit", { device });
});

app.get("/device/:id", async (req, res) => {
  const device = await Device.findById(req.params.id);
  res.render("patient/show_device", {
    device,
    page_css: null,
    page_script: null,
    title: "About Us",
  });
});

app.put("/device/:id", async (req, res) => {
  const { id } = req.params;
  const device = await Device.findByIdAndUpdate(id, {
    ...req.body.device,
  });
  res.redirect(`/device/${device._id}`);
});

app.get("/about", (req, res) => {
  res.render("about", {
    page_css: "about.css", // Pass the name of the stylesheet file
    page_script: null,
    title: "About Us",
  });
});

app.listen(8080, () => {
  console.log("Serving on port 8080");
});
