# Heart-Rate-Monitor
A simple and user-friendly IoT + web system to measure **heart rate** and **blood oxygen (SpO2)**.

# Table of Contents
1. Description
2. Requirements
3. Installation (From Scratch)
4. Links + Demo Login
5. Contact

# Description
HeartTrack is an IoT-enabled monitoring system built around a **Particle Photon 2** and a **MAX30105** optical sensor. The device periodically prompts the user to place a finger on the sensor, computes heart rate and SpO2 using the Maxim algorithm library, and publishes readings to the backend through the Particle Cloud. The web application supports user accounts, device registration, and viewing recently collected data.

# Requirements
1. Periodic measurements: the device requests a new reading every **30 minutes** (production setting).
2. Offline mode: if the device is not connected to Wi-Fi/Cloud, it briefly flashes the RGB LED **yellow**, stores readings locally (EEPROM) for **up to 24 hours**, and uploads stored data when reconnected.
3. Configurable time window: the measurement time-of-day range is configurable from the application; by default the device only requests readings between **6:00 AM and 10:00 PM (06:00–22:00)**.

# Installation (From Scratch)

## Hardware Needed
1. Particle Photon 2
2. MAX30105 sensor module
3. Micro-USB cable
4. Breadboard + jumper wires

## Software Needed
1. Particle Workbench (VS Code)
2. Particle Cloud account + access to Particle Console
3. Backend/server environment (Node.js) + MongoDB (if running locally)

## Steps (Userpage)
(Tanmay: please replace this section with the exact user steps and screenshots if needed.)
1.Create an account / login.
2.Register a device using the Particle hardwareId.
3.Open the dashboard and view device readings charts (HR + SpO2).
4.Browse physicians, assign/remove a physician, and view physician dashboard.

## Steps (Particle / Firmware)
1. Wire the MAX30105 to the Photon 2 (I2C + power + ground).
2. Open the Particle firmware project in VS Code (Particle Workbench).
3. Compile and flash the firmware to the Photon 2.
4. Confirm the device comes online in Particle Console and is publishing events.

## Steps (Server)
1. Start the server:
   - `sh run_server.sh`
2. Run continuously:
   - `sh run_server_nonstop.sh`
3. Kill the server:
   - `sh kill_server.sh`

# Links + Demo Login
- Server: (paste link here)
- Milestone Demo Video: (paste link here)
- Pitch Video: (paste link here)
- Final Demo Video: (paste link here)

Existing user account (recent data):
- Email: 
- Password: 


# Contact
Contributors:
- Shutong Feng   fst@arizona.edu
- Ricardo Ramirez rikram101@arizona.edu
- Tanmay Nalawade  tanmaynalawade@arizona.edu
