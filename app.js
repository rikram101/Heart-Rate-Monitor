const express = require("express");
const path = require("path");

const app = express();

require("./models/Physician");

// Telling express to use ejs as the templating engine
app.set("view engine", "ejs");
// Setting the directory for ejs templates
app.set("views", path.join(__dirname, "views"));

app.use(express.static("public"));

app.get("/", (req, res) => {
  res.render("home");
});

const Physician = require("./models/Physician");

app.get("/test-physician", async (req, res) => {
  try {
    const physician = new Physician({
      firstName: "Test",
      lastName: "User",
      email: "test@example.com",
      password: "12345",
      patients: [] // empty for now
    });

    await physician.save();
    res.send("Physician saved!");
  } catch (err) {
    console.error(err);
    res.status(500).send("Error saving physician");
  }
});

app.listen(8080, () => {
  console.log("Serving on port 3000");
});
