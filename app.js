const express = require("express");
const path = require("path");

const app = express();

// Telling express to use ejs as the templating engine
app.set("view engine", "ejs");
// Setting the directory for ejs templates
app.set("views", path.join(__dirname, "views"));

app.get("/", (req, res) => {
  res.render("home");
});

app.listen(8080, () => {
  console.log("Serving on port 8080");
});
