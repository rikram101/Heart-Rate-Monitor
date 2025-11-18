const express = require("express");
const app = express();
const path = require("path");

// Telling express to use ejs as the templating engine
app.set("view engine", "ejs");
// Setting the directory for ejs templates
app.set("views", path.join(__dirname, "views"));

app.use(express.static("public"));

app.get("/", (req, res) => {
  res.render("home");
});

app.get("/index", (req, res) => {
  res.render("index");
});

app.listen(8080, () => {
  console.log("Serving on port 8080");
});
