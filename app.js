const express = require("express");
const path = require("path");
const session = require("express-session");
const passport = require("passport");
const ExpressError = require("./utils/ExpressError");
const LocalStrategy = require("passport-local");
const ejsMate = require("ejs-mate");
const methodOverried = require("method-override");
const flash = require("connect-flash");

const app = express();

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
