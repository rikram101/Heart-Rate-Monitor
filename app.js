const express = require("express");
const path = require("path");
const session = require("express-session");
const passport = require("passport");
const ExpressError = require("./utils/ExpressError");
const LocalStrategy = require("passport-local");
const ejsMate = require("ejs-mate");
const methodOverried = require("method-override");
const flash = require("connect-flash");
const cors = require("cors");


const app = express();
const API_KEY = process.env.HEARTTRACK_API_KEY || "YOUR_SECRET_KEY";

// Routes
const userRoutes = require("./routes/users");
const patientRoutes = require("./routes/patients");

require("./db"); // To run mongoose.connect() code from db.js

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

const Patient = require("./models/patient");
const Physician = require("./models/physician");
const Reading = require("./models/reading");

// The session
const sessionConfig = {
  secret: "thisshouldbeabettersecret!",
  resave: false,
  saveUninitialized: true,
  cookie: {
    httpOnly: true,
    expires: Date.now() + 1000 * 60 * 60 * 24 * 7, //Set to expire after a week
    maxAge: 1000 * 60 * 60 * 24 * 7,
  },
};

// This should be befoer passport session initialisation
app.use(session(sessionConfig));
app.use(flash());

// Middleware
app.use(cors());
app.use(express.json());

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

app.use((req, res, next) => {
  res.locals.currentUser = req.user;
  res.locals.success = req.flash("success");
  res.locals.error = req.flash("error");
  next();
});

app.use("/", userRoutes);
app.use("/patient", patientRoutes);

app.get("/", (req, res) => {
  res.render("home", {
    page_css: "home.css", // Pass the name of the stylesheet file
    page_script: "home.js",
    title: "Core-Beat Home",
  });
});

app.get("/about", (req, res) => {
  res.render("about", {
    page_css: "about.css", // Pass the name of the stylesheet file
    page_script: null,
    title: "About Us",
  });
});

app.post("/reading", async (req, res) => {
  const { apiKey, deviceId, heartRate: hrRaw, spo2: spo2Raw, timestamp } = req.body;

  const isValidApiKey = apiKey === API_KEY;

  console.log("Received JSON:", JSON.stringify(req.body, null, 4));
  console.log("Validation Result:", isValidApiKey ? "Success" : "Failure");

  if (!isValidApiKey) {
    return res.status(403).json({
      message: "Failure: Invalid API Key",
      received: req.body,
    });
  }

  // ---- Convert values to numbers ----
  let heartRate = hrRaw !== undefined ? Number(hrRaw) : null;
  let spo2 = spo2Raw !== undefined ? Number(spo2Raw) : undefined;

  // ---- Handle your sentinel / bad readings ----
  // Ignore readings with invalid heart rate
  if (Number.isNaN(heartRate) || heartRate < 0 || heartRate === -999) {
    console.log("Ignoring reading because heartRate is invalid/sentinel:", hrRaw);
    return res.status(200).json({
      message: "Invalid heart rate (sentinel or missing), reading ignored",
      received: req.body,
    });
  }

  // Allow spo2 to be missing if it's bad/sentinel
  if (Number.isNaN(spo2) || spo2 < 0 || spo2 === -999) {
    console.log("SpO2 is invalid/sentinel, will be stored as undefined:", spo2Raw);
    spo2 = undefined; // spo2 is optional in the schema
  }

  if (!deviceId) {
    return res.status(400).json({
      message: "Missing deviceId",
      received: req.body,
    });
  }

  // ---- Safely parse device timestamp → readingTime ----
  let readingTime;
  if (timestamp !== undefined) {
    const tsNum = Number(timestamp);
    if (!Number.isNaN(tsNum)) {
      // timestamp is in UNIX seconds → convert to ms
      readingTime = new Date(tsNum * 1000);
    }
  }

  try {
    const reading = new Reading({
      deviceHardwareId: deviceId,
      heartRate,
      spo2,
      raw: req.body, // keep full webhook payload if you want
      // only set readingTime if we parsed a valid date
      ...(readingTime ? { readingTime } : {}),
    });

    await reading.save();

    return res.status(201).json({
      message: "Success! Reading stored",
      id: reading._id,
    });
  } catch (err) {
    console.error("Error saving reading:", err);
    return res.status(500).json({
      message: "Internal server error while saving reading",
    });
  }
});



app.all(/(.*)/, (req, res, next) => {
  next(new ExpressError("Page Not Found", 404));
});

app.use((err, req, res, next) => {
  const { statusCode = 500 } = err;
  if (!err.message) err.message = "Oh No, Something Went Wrong!";
  res.status(statusCode).render("error", {
    err,
    page_css: "error.css", // Pass the name of the stylesheet file
    page_script: null,
    title: "Error",
  });
});



app.listen(8080, () => {
  console.log("Serving on port 8080");
});
