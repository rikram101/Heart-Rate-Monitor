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

## 📖 User Workflow & Usage Steps

This section outlines the core functionality for Patient users, from account creation to device management and physician collaboration.

### 1. Account Creation & Authentication
Users must first create a secure account to access the platform.
* Navigate to the **Register** page.
* Enter a username, email, and secure password.
* **Select Role:** Choose "Patient" to manage your own devices or "Physician" to monitor assigned patients.
* Once registered, use the **Login** page to access your secure session.

> <img width="1728" height="966" alt="Login" src="https://github.com/user-attachments/assets/42894368-763e-4360-8771-8f71211162fe" />


### 2. Device Registration
To start tracking health data, a patient must link their hardware to their account.
* After logging in, navigate to the **"My Devices"** tab.
* Click **"Add New Device"**.
* **Hardware ID:** Enter the unique Particle Device ID provided with your hardware kit.
* **Label:** Give the device a friendly name (e.g., "Dad's Smart Watch").
* Click **Submit** to register the device to your profile.

> <img width="1728" height="967" alt="Register" src="https://github.com/user-attachments/assets/bc78608b-63fc-43f8-96c6-885412b89a97" />


### 3. Health Monitoring (The Dashboard)
The core of the application is the data visualization dashboard.
* From the "My Devices" list, click on a specific device.
* You will be directed to the **Readings Dashboard**.
* **Interactive Charts:** View real-time Heart Rate (BPM) and SpO₂ (%) data visualized on dynamic line graphs.
* **Date Filtering:** Use the date pickers to filter the graph data by specific days or weeks to track trends over time.

> <img width="988" height="856" alt="Screenshot 2025-12-15 at 8 51 21 AM" src="https://github.com/user-attachments/assets/4b409505-11d7-49ec-9191-b1b205ea0837" />


### 4. Physician Collaboration
Patients can grant access to medical professionals for remote monitoring.
* Navigate to the **"Physicians"** directory page to browse available doctors.
* Click **"Assign"** on a specific physician's card to grant them read-access to your health data.
* **Physician View:** Once assigned, the physician can view your dashboard and use the **Physician Controls** to remotely adjust your device's measurement frequency (e.g., changing intervals from 60 mins to 15 mins) based on your health needs.
* Patients can revoke access at any time by clicking "Remove" in their profile settings.

> <img width="624" height="960" alt="Choose Physician" src="https://github.com/user-attachments/assets/eb324489-aa38-4367-81de-0cad73936113" />


## Steps (Particle)
1. Wire the MAX30105 to the Photon 2 (I2C + power + ground).
2. Open the Particle firmware project in VS Code (Particle Workbench).
3. Compile and flash the firmware to the Photon 2.
4. Confirm the device comes online in Particle Console and is publishing events.

## Steps (Server)
1. Clone the repository
git clone <repo-url>
cd Heart-Rate-Monitor
2. Install dependencies
npm install
3. Configure environment variables
Create a .env file and set required values (e.g., MongoDB URI, API key, AWS credentials, port):
PORT=8080
MONGODB_URI=...
API_KEY=...
AWS_REGION=...
AWS_BUCKET_NAME=...
4. Start MongoDB
Ensure MongoDB is running locally or accessible via the configured URI.
5. Run the server
npm start
or (for development with auto-reload):
npm run dev
6. Access the application
Open a browser and navigate to:
http://localhost:8080

# Links + Demo Login
- Server: https://ec2-3-138-118-190.us-east-2.compute.amazonaws.com/
- Milestone Demo Video: https://emailarizona-my.sharepoint.com/personal/rikram101_arizona_edu/_layouts/15/stream.aspx?id=%2Fpersonal%2Frikram101%5Farizona%5Fedu%2FDocuments%2FRecordings%2FTest%20recording%201%2D20251121%5F190906%2DMeeting%20Recording%2Emp4&nav=eyJyZWZlcnJhbEluZm8iOnsicmVmZXJyYWxBcHAiOiJTdHJlYW1XZWJBcHAiLCJyZWZlcnJhbFZpZXciOiJTaGFyZURpYWxvZy1MaW5rIiwicmVmZXJyYWxBcHBQbGF0Zm9ybSI6IldlYiIsInJlZmVycmFsTW9kZSI6InZpZXcifX0%3D&referrer=StreamWebApp%2EWeb&referrerScenario=AddressBarCopied%2Eview%2E4aec07d0%2Db34e%2D4f70%2D8735%2Dcff4b4ebbe22)
- Pitch Video: https://arizona.zoom.us/rec/play/y-FEj5uqyn-IlQJBWkvS13OiE9uCdTMgzrHYhAEzhdSf0ya9AiW6TQX1BFsoQLVHA4-PXQ4hyHfcSZQ8.cISI1joNh5-qbSOv?autoplay=true&startTime=1765865651000
- Final Demo Video: https://arizona.zoom.us/rec/play/05FLzqTJvgM1DgHDsPFUWaE2mjfV-BBLVmCamY5lXTsKX3Z_f_QGhSY-RwImx-RWGS2HProDJxn_jA5e.XES6bBvzHtkpGwXY?autoplay=true&startTime=1765862658000

Existing user account (recent data):
- Email: Tony@email.com
- Password: 1234567


# Contact
Contributors:
- Shutong Feng   fst@arizona.edu
- Ricardo Ramirez rikram101@arizona.edu
- Tanmay Nalawade  tanmaynalawade@arizona.edu
