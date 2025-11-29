const express = require("express");
const app = express();
const path = require("path");
const session = require("express-session");
const passport = require("passport");
const LocalStrategy = require("passport-local");

// Routes
const userRoutes = require("./routes/users");

require("./db"); // To run mongoose.connect() code from db.js

const User = require("./models/user");

// Telling express to use ejs as the templating engine
app.set("view engine", "ejs");
// Setting the directory for ejs templates
app.set("views", path.join(__dirname, "views"));
app.use(express.static("public"));

// For express to parse from req data
app.use(express.urlencoded({ extended: true }));
// For JSON telemetry/webhooks
app.use(express.json());

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
// Telemetry API routes (unauthenticated endpoint for device webhooks)
app.use(require("./routes/telemetry"));

// Debug route to list mounted paths (remove in production)
app.get("/debug/routes", (req, res) => {
  const routes = [];
  app._router.stack.forEach((m) => {
    if (m.route && m.route.path) {
      const methods = Object.keys(m.route.methods).filter((k) => m.route.methods[k]);
      routes.push({ path: m.route.path, methods });
    }
  });
  res.json(routes);
});

app.get("/", (req, res) => {
  res.render("home");
});

app.get("/fake-user", async (req, res) => {
  const user = new User({ email: "test@gmail.com" });
  const newUser = await User.register(user, "password123");
  res.send(newUser);
});


app.get("/dashboard", (req, res) => {
  res.render("dashboard");
});

app.get("/index", (req, res) => {
  res.render("index");
});

const PORT = process.env.PORT || 8080;
const HOST = process.env.HOST || "0.0.0.0";

app.listen(PORT, HOST, () => {
  console.log(`Serving on http://${HOST}:${PORT}`);
});
