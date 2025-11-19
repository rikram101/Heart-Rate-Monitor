const express = require("express");
const path = require("path");
const app = express();
app.use(express.urlencoded({ extended: true }));

app.use((req, res, next) => {
  console.log("➡️  Incoming request:", req.method, req.url);
  next();
});


const User = require("./models/Users");
// Initialize MongoDB connection (configured in ./db)
require("./db");

// Telling express to use ejs as the templating engine
app.set("view engine", "ejs");
// Setting the directory for ejs templates
app.set("views", path.join(__dirname, "views"));

app.use(express.static("public"));

app.get("/", (req, res) => {
  res.render("home");
});

app.get("/login", (req, res) => {
  res.render("login");
});

app.get("/register", (req, res) => {
  res.render("register");
});

app.post("/register", async (req, res) => {
  console.log("🔥🔥🔥 HIT POST /register 🔥🔥🔥");
  console.log("📥 POST /register body:", req.body);

  const { username, email, password } = req.body;

  try {
    const newUser = new User({ username, email, password });
    await newUser.save();
    console.log("✅ User saved:", newUser);
    res.redirect("/users");
  } catch (err) {
    console.error("❌ Error saving user:", err);
    res.status(500).send("Error creating user");
  }
});

app.get("/users", async (req, res) => {
  try {
    const users = await User.find();
    res.render("users", { users });
  } catch (err) {
    console.error("❌ Error fetching users:", err);
    res.status(500).send("Error fetching users");
  }
});

app.listen(8080, () => {
  console.log("Serving on port 8080");
});
