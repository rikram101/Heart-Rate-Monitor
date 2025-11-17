const express = require("express");
const path = require("path");
const app = express();
const User = require("./models/Users");

// Telling express to use ejs as the templating engine
app.set("view engine", "ejs");
// Setting the directory for ejs templates
app.set("views", path.join(__dirname, "views"));

app.get("/", (req, res) => {
  res.render("home");
});

app.get("/user", (req, res) => {
  res.render("user");
});

app.listen(8080, () => {
  console.log("Serving on port 8080");
});
