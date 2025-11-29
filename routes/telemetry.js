const express = require("express");
const router = express.Router();

const Device = require("../models/Device");
const Telemetry = require("../models/Telemetry");

// Simple echo endpoint for quick testing
router.post("/api/telemetry/echo", (req, res) => {
  console.log("\ud83d\udce1 Incoming telemetry (echo):", req.body);
  return res.status(201).json({
    status: "ok",
    receivedAt: new Date().toISOString(),
    data: req.body,
  });
});

// POST /api/telemetry
// Content-Type: application/json
// {
//   "hardwareId": "DEVICE_123",
//   "heartRate": 72,
//   "spo2": 98,
//   "timestamp": 1732752000000,
//   "extra": { ... }
// }
router.post("/api/telemetry", async (req, res) => {
  try {
    if (!req.is("application/json")) {
      return res.status(415).json({ error: "Content-Type must be application/json" });
    }

    const { hardwareId, deviceId, heartRate, spo2, timestamp, ...rest } = req.body || {};
    const resolvedHardwareId = hardwareId || deviceId; // accept either key

    if (!resolvedHardwareId || typeof resolvedHardwareId !== "string") {
      return res.status(400).json({ error: "hardwareId (string) is required; alias 'deviceId' is also accepted" });
    }

    // Basic validation for numeric metrics (if provided)
    const hr = heartRate !== undefined ? Number(heartRate) : undefined;
    const ox = spo2 !== undefined ? Number(spo2) : undefined;

    if (hr !== undefined && (Number.isNaN(hr) || hr < 0 || hr > 300)) {
      return res.status(400).json({ error: "heartRate must be a number between 0 and 300" });
    }
    if (ox !== undefined && (Number.isNaN(ox) || ox < 0 || ox > 100)) {
      return res.status(400).json({ error: "spo2 must be a number between 0 and 100" });
    }

    // Resolve device by hardwareId (optional, but useful for association)
    const device = await Device.findOne({ hardwareId: resolvedHardwareId }).select("_id hardwareId");

    const doc = await Telemetry.create({
      device: device ? device._id : undefined,
      hardwareId: resolvedHardwareId,
      heartRate: hr,
      spo2: ox,
      payload: rest && Object.keys(rest).length ? { ...rest } : undefined,
      receivedAt: timestamp ? new Date(Number(timestamp)) : new Date(),
    });

    // Keep console log lightweight for debugging on EC2
    console.log("Telemetry received", {
      id: doc._id.toString(),
      hardwareId: resolvedHardwareId,
      heartRate: hr,
      spo2: ox,
      ts: doc.receivedAt.toISOString(),
    });

    return res.status(202).json({
      status: "accepted",
      id: doc._id,
      deviceLinked: Boolean(device),
    });
  } catch (err) {
    console.error("Telemetry error:", err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

module.exports = router;
