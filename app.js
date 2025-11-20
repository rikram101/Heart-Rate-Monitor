const express = require("express");
const app = express();
const path = require("path");
const session = require("express-session");
const passport = require("passport");
const LocalStrategy = require("passport-local");

require("./db"); // To run mongoose.connect() code from db.js

const Physician = require("./models/physician");
const User = require("./models/user");

// Telling express to use ejs as the templating engine
app.set("view engine", "ejs");
// Setting the directory for ejs templates
app.set("views", path.join(__dirname, "views"));
app.use(express.static("public"));

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
passport.use(new LocalStrategy(User.authenticate()));

// How to store user in the session
passport.serializeUser(User.serializeUser());
// How to get user out of the session
passport.deserializeUser(User.deserializeUser());

app.get("/", (req, res) => {
  res.render("home");
});

app.get("/test-physician", async (req, res) => {
  try {
    const physician = new Physician({
      firstName: "Test",
      lastName: "User",
      email: "test@example.com",
      password: "12345",
      patients: [], // empty for now
    });

    await physician.save();
    res.send("Physician saved!");
  } catch (err) {
    console.error(err);
    res.status(500).send("Error saving physician");
  }
});

app.post("/register", async (req, res) => {
  try {
    const { firstName, lastName, email, password } = req.body;

    // Basic validation
    if (!firstName || !email || !password) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    // Check if user already exists
    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(409).json({ error: "Email already in use" });
    }

    // Create user
    const newUser = await User.create({
      firstName,
      lastName,
      email,
      password,
    });

    await newUser.save();

    res.status(201).json({
      message: "User created successfully",
      user: newUser,
    });
  } catch (error) {
    console.error("Error creating user:", error);
    res.status(500).json({ error: "Server error" });
  }
});

app.get("/index", (req, res) => {
  res.render("index");
});

app.listen(8080, () => {
  console.log("Serving on port 8080");
});
