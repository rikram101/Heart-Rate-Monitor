const express = require("express");
const app = express();
const path = require("path");
const session = require("express-session");
const passport = require("passport");
const LocalStrategy = require("passport-local");

// Routes
const userRoutes = require("./routes/users");

require("./db"); // To run mongoose.connect() code from db.js

const Physician = require("./models/physician");
const User = require("./models/user");

// Telling express to use ejs as the templating engine
app.set("view engine", "ejs");
// Setting the directory for ejs templates
app.set("views", path.join(__dirname, "views"));
app.use(express.static("public"));

// For express to parse from req data
app.use(express.urlencoded({ extended: true }));

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
  new LocalStrategy(
    {
      // This tells Passport to look for req.body.email
      // Because we have set out username as email in schema and passport under the hood looks for username while authenticating
      usernameField: "email",
    },
    User.authenticate()
  )
);

// How to store user in the session
passport.serializeUser(User.serializeUser());
// How to get user out of the session
passport.deserializeUser(User.deserializeUser());

app.use("/", userRoutes);

app.get("/", (req, res) => {
  res.render("home");
});

app.get("/fake-user", async (req, res) => {
  const user = new User({ email: "test@gmail.com" });
  const newUser = await User.register(user, "password123");
  res.send(newUser);
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

app.get("/dashboard", (req, res) => {
  res.render("dashboard");
});

app.get("/index", (req, res) => {
  res.render("index");
});

app.listen(8080, () => {
  console.log("Serving on port 8080");
});
