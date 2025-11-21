const express = require("express");
const session = require("express-session");
const path = require("path");
const http = require("http");
const { Server } = require("socket.io");
const { spawn } = require("child_process");
const app = express();

const User = require("./models/Users");
// Initialize MongoDB connection (configured in ./db)
require("./db");

// ---------- Middleware ----------
app.use(express.urlencoded({ extended: true }));

app.use((req, res, next) => {
  console.log("➡️  Incoming request:", req.method, req.url);
  next();
});

// Sessions
app.use(
  session({
    secret: "replace_this_with_a_better_secret",
    resave: false,
    saveUninitialized: false,
    cookie: {
      maxAge: 1000 * 60 * 60 // 1 hour
    }
  })
);

// View engine
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

// Static files
app.use(express.static("public"));

// ---------- Auth middleware ----------
function requireLogin(req, res, next) {
  if (!req.session.userId) {
    return res.redirect("/login");
  }
  next();
}

// (Optional) make username available in all views
// so you can show "Logged in as ..." in header if you want
app.use((req, res, next) => {
  res.locals.currentUser = req.session?.username || null;
  next();
});

// ---------- Routes ----------

// Home
app.get("/", (req, res) => {
  res.render("home");
});

// Login form
app.get("/login", (req, res) => {
  res.render("login");
});

// Handle login
app.post("/login", async (req, res) => {
  const { username, password } = req.body;

  try {
    // 1) Find user
    const user = await User.findOne({ username });
    if (!user) {
      return res.status(400).send("Invalid username or password");
      // later: res.render("login", { error: "Invalid username or password" });
    }

    // 2) Check password using the comparePassword method from your model
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(400).send("Invalid username or password");
    }

    // 3) Save user info in the session
    req.session.userId = user._id;
    req.session.username = user.username;

    // 4) Redirect to a protected page
    res.redirect("/dashboard");
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).send("Server error during login");
  }
});

// Register form
app.get("/register", (req, res) => {
  res.render("register");
});

// Handle registration
app.post("/register", async (req, res) => {
  console.log("🔥🔥🔥 HIT POST /register 🔥🔥🔥");
  console.log("📥 POST /register body:", req.body);

  const { username, email, password } = req.body;

  try {
    const newUser = new User({ username, email, password });
    await newUser.save();
    console.log("✅ User saved:", newUser);

    // After registering, send user to login page
    res.redirect("/login");
  } catch (err) {
    console.error("❌ Error saving user:", err);
    res.status(500).send("Error creating user");
  }
});

// Protected dashboard
app.get("/dashboard", requireLogin, (req, res) => {
  res.render("dashboard", { username: req.session.username });
});

// Logout
app.post("/logout", (req, res) => {
  req.session.destroy(err => {
    if (err) {
      console.error("Error destroying session:", err);
      return res.status(500).send("Error logging out");
    }
    // Clear cookie just to be clean
    res.clearCookie("connect.sid");
    res.redirect("/");
  });
});

// Debug route: list all users (probably not for production)
app.get("/users", async (req, res) => {
  try {
    const users = await User.find();
    res.render("users", { users });
  } catch (err) {
    console.error("❌ Error fetching users:", err);
    res.status(500).send("Error fetching users");
  }
});

// Create HTTP server and attach Socket.IO
const server = http.createServer(app);
const io = new Server(server);

// Spawn Particle CLI `serial monitor` and stream lines to connected clients
let particleProc = null;
let connectedClients = 0;

function startParticleMonitor() {
  if (particleProc) return;
  console.log("Starting Particle serial monitor...");
  particleProc = spawn("particle", ["serial", "monitor"]);

  particleProc.stdout.setEncoding("utf8");
  particleProc.stdout.on("data", data => {
    data.split(/\r?\n/).forEach(line => {
      if (line && line.trim().length) {
        console.log("[particle]", line);
        io.emit("serial", line);
      }
    });
  });

  particleProc.stderr.on("data", d => {
    const s = d.toString();
    console.error("[particle stderr]", s);
    io.emit("serial", `[particle error] ${s}`);
  });

  particleProc.on("close", code => {
    console.log("Particle serial monitor exited with code", code);
    particleProc = null;
    io.emit("serial", `[particle exited: ${code}]`);
  });

  particleProc.on("error", err => {
    console.error("Failed to spawn Particle CLI:", err);
    io.emit("serial", `[particle spawn error] ${err.message}`);
    particleProc = null;
  });
}

function stopParticleMonitor() {
  if (!particleProc) return;
  console.log("Stopping Particle serial monitor...");
  try {
    particleProc.kill();
  } catch (err) {
    console.error("Error killing Particle process:", err);
  }
  particleProc = null;
}

io.on("connection", socket => {
  connectedClients++;
  console.log("Socket connected:", socket.id, "(clients=", connectedClients, ")");
  // start monitor when first client connects
  if (connectedClients === 1) startParticleMonitor();

  // allow client to manually start/stop the monitor
  socket.on("startMonitor", () => {
    console.log("Client requested startMonitor", socket.id);
    startParticleMonitor();
    socket.emit("status", { running: !!particleProc });
  });

  socket.on("stopMonitor", () => {
    console.log("Client requested stopMonitor", socket.id);
    stopParticleMonitor();
    socket.emit("status", { running: !!particleProc });
  });

  // report current status on request
  socket.on("getStatus", () => {
    socket.emit("status", { running: !!particleProc, clients: connectedClients });
  });

  socket.on("disconnect", () => {
    connectedClients--;
    console.log("Socket disconnected:", socket.id, "(clients=", connectedClients, ")");
    // stop monitor when no clients remain
    if (connectedClients <= 0) {
      stopParticleMonitor();
    }
  });
});

server.listen(8080, () => {
  console.log("Serving on port 8080");
});
