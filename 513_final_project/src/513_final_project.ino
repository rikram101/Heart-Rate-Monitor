#include "Particle.h"
#include "MAX30105.h"
#include "heartRate.h"
#include "spo2_algorithm.h"

SYSTEM_MODE(AUTOMATIC);
SYSTEM_THREAD(ENABLED);

MAX30105 particleSensor;

// ====================== Measurement Buffers ======================
const int MAX_READINGS = 100;
uint32_t irBuffer[MAX_READINGS];
uint32_t redBuffer[MAX_READINGS];

int32_t spo2;
int8_t  validSPO2;
int32_t heartRate;
int8_t  validHeartRate;

// ====================== Identification ======================
String hardwareId;                         // Particle device ID (hardwareId in DB)

// ====================== Timing Settings ======================
// For testing: 30 seconds. For production (spec), change to 30 minutes.
const unsigned long MEAS_INTERVAL_MS  = 30000;                 // 30 seconds (testing)
// const unsigned long MEAS_INTERVAL_MS  = 30UL * 60UL * 1000UL;  // 30 minutes (production)

const unsigned long PROMPT_TIMEOUT_MS = 5UL * 60UL * 1000UL;   // 5 minutes

// Periodic background check for uploading offline data
const unsigned long OFFLINE_CHECK_INTERVAL_MS = 60UL * 1000UL; // every 1 minute

// Maximum age for offline measurements (24 hours, in seconds)
const uint32_t MAX_OFFLINE_AGE_SEC = 24UL * 60UL * 60UL;       // 24 hours

// ====================== Time-of-day window (configurable) ======================
int measurementStartHour = 6;   // inclusive, default 6:00
int measurementEndHour   = 22;  // exclusive, default 22:00

int setMeasurementWindow(String command);   // "start,end", e.g. "6,22"

// ====================== Offline Storage (EEPROM) ======================
struct StoredMeasurement {
    uint32_t timestamp;   // Unix time when measurement was taken (0 = unknown)
    float spo2;
    float heartRate;
};

const int MAX_STORED = 48;                                    // up to 48 offline records
const int EEPROM_START = 0;                                   // base address in EEPROM
const int EEPROM_COUNT_ADDR = EEPROM_START + MAX_STORED * sizeof(StoredMeasurement);

int storedCount = 0;                                          // number of stored records

// ====================== Function Declarations ======================
void takeMeasurement(int32_t *spo2Out, int32_t *hrOut);
bool fingerOnSensor();

void loadOfflineMetadata();
void saveOfflineCount();
void saveOfflineMeasurement(float spo2Val, float hrVal);
void clearOfflineStorage();

// ====================== Non-blocking LED Controller ======================
enum LedMode {
    LED_NONE = 0,
    LED_PROMPT_BLUE,      // continuous blink while waiting for finger
    LED_OK_GREEN,         // 3 blinks after successful publish
    LED_OFFLINE_YELLOW    // 3 blinks after storing offline
};

struct LedController {
    LedMode mode = LED_NONE;
    bool on = false;                    // current on/off phase
    int togglesRemaining = 0;           // for finite blink sequences (on+off counts)
    unsigned long lastToggleMs = 0;
    unsigned long intervalMs = 200;     // default blink interval
};

LedController led;

void startPromptLed() {
    led.mode = LED_PROMPT_BLUE;
    led.on = false;
    led.togglesRemaining = -1;          // infinite
    led.lastToggleMs = millis();
    led.intervalMs = 200;
}

void stopPromptLed() {
    if (led.mode == LED_PROMPT_BLUE) {
        led.mode = LED_NONE;
        led.on = false;
        RGB.color(0, 0, 0);
        digitalWrite(D7, LOW);
    }
}

void startOkLed() {
    led.mode = LED_OK_GREEN;
    led.on = false;
    led.togglesRemaining = 6;           // 3 blinks = 6 toggles (on/off)
    led.lastToggleMs = millis();
    led.intervalMs = 200;
}

void startOfflineLed() {
    led.mode = LED_OFFLINE_YELLOW;
    led.on = false;
    led.togglesRemaining = 6;           // 3 blinks
    led.lastToggleMs = millis();
    led.intervalMs = 200;
}

// Fatal error indicator can remain blocking (hardware issue)
void flashErrorPurpleForever() {
    while (true) {
        RGB.color(255, 0, 255); // Purple
        delay(300);
        RGB.color(0, 0, 0);
        delay(300);
    }
}

// Run this every loop() to update LEDs without delay()
void updateLed() {
    if (led.mode == LED_NONE) {
        return;
    }

    unsigned long now = millis();
    if (now - led.lastToggleMs < led.intervalMs) {
        return;
    }
    led.lastToggleMs = now;

    // Toggle phase
    led.on = !led.on;

    // Apply color based on mode and phase
    if (!led.on) {
        // Off phase
        RGB.color(0, 0, 0);
        digitalWrite(D7, LOW);
    } else {
        // On phase
        digitalWrite(D7, HIGH);
        if (led.mode == LED_PROMPT_BLUE) {
            RGB.color(0, 0, 255);
        } else if (led.mode == LED_OK_GREEN) {
            RGB.color(0, 255, 0);
        } else if (led.mode == LED_OFFLINE_YELLOW) {
            RGB.color(255, 255, 0);
        }
    }

    // For finite sequences, count down toggles and stop when done
    if (led.togglesRemaining > 0) {
        led.togglesRemaining--;
        if (led.togglesRemaining == 0) {
            led.mode = LED_NONE;
            led.on = false;
            RGB.color(0, 0, 0);
            digitalWrite(D7, LOW);
        }
    }
}

// ====================== Application State Machine ======================
enum AppState {
    STATE_IDLE = 0,
    STATE_PROMPT_WAIT_FINGER,
    STATE_MEASURE_BLOCKING,
    STATE_UPLOAD_OFFLINE_NONBLOCKING
};

AppState state = STATE_IDLE;

// Next scheduled measurement time (millis)
unsigned long nextMeasurementDueMs = 0;

// Prompt timeout tracking
unsigned long promptStartMs = 0;

// Periodic offline upload attempt timer
unsigned long lastOfflineUploadCheckMs = 0;

// Offline upload pacing (non-blocking replacement for delay(2000))
int uploadIndex = 0;
bool offlineAllOk = true;
unsigned long nextOfflinePublishAllowedMs = 0;

// If we started offline upload because we just took a new measurement,
// we will publish the current measurement after offline upload finishes.
bool pendingPublishCurrent = false;
float pendingSpO2 = 0.0f;
float pendingHR   = 0.0f;
uint32_t pendingTs = 0;

// ====================== Helpers ======================
bool isOnline() {
    return WiFi.ready() && Particle.connected();
}

bool isInMeasurementWindow() {
    // If time is not valid yet, allow measurements (same behavior as "assume in window")
    if (!Time.isValid()) {
        return true;
    }
    int h = Time.hour();
    return (h >= measurementStartHour && h < measurementEndHour);
}

bool publishMeasurement(float spo2Val, float hrVal, uint32_t ts) {
    String payload = String::format(
        "{\"hardwareId\":\"%s\","
        "\"spo2\":%.2f,\"heartRate\":%.2f,\"timestamp\":%lu}",
        
        hardwareId.c_str(),
        spo2Val,
        hrVal,
        (unsigned long)ts
    );

    return Particle.publish("HeartTrack", payload, PRIVATE);
}

// ====================== Setup ======================
void setup() {
    Serial.begin(115200);
    // Wait up to 10 seconds so the PC serial monitor can attach
    waitFor(Serial.isConnected, 10000);

    RGB.control(true);
    pinMode(D7, OUTPUT);

    // Identification
    hardwareId = System.deviceID();
    Serial.printlnf("Hardware ID (use this as hardwareId when registering): %s",
                    hardwareId.c_str());

    // Time zone (optional, helpful for debugging)
    Time.zone(-7); // Example: Arizona (UTC-7)

    // Particle function to configure measurement window from the web app
    // Example payload: "6,22" for measurements between 6:00 and 22:00
    Particle.function("setWindow", setMeasurementWindow);

    // Load offline metadata (how many records are in EEPROM)
    loadOfflineMetadata();

    // Initialize MAX30105 sensor over I2C
    if (!particleSensor.begin(Wire, I2C_SPEED_FAST)) {
        Serial.println("MAX30105 not found! Check wiring and power.");
        flashErrorPurpleForever(); // Fatal hardware error indicator
    }

    // Default sensor configuration
    particleSensor.setup();
    particleSensor.setPulseAmplitudeRed(0x0A);   // Low red brightness
    particleSensor.setPulseAmplitudeGreen(0x00); // Turn off green LED

    Serial.println("HeartTrack firmware (non-blocking prompt + non-blocking offline upload pacing) ready.");
    Serial.println("Device will ask for a measurement on a fixed schedule.");

    // Schedule first measurement soon after boot
    nextMeasurementDueMs = millis();
    lastOfflineUploadCheckMs = millis();
}

// ====================== Main Loop (state machine) ======================
void loop() {
    unsigned long now = millis();

    // Always keep LED updates non-blocking
    updateLed();

    // Background: if we're online and it's time, start a non-blocking offline upload
    // (only if we're not already busy with prompt/measure/upload)
    if (state == STATE_IDLE &&
        isOnline() &&
        storedCount > 0 &&
        (now - lastOfflineUploadCheckMs >= OFFLINE_CHECK_INTERVAL_MS)) {

        Serial.println("Periodic offline upload check triggered (non-blocking).");
        state = STATE_UPLOAD_OFFLINE_NONBLOCKING;
        uploadIndex = 0;
        offlineAllOk = true;
        nextOfflinePublishAllowedMs = now; // allow first publish immediately
        pendingPublishCurrent = false;     // this was not triggered by a new measurement
        lastOfflineUploadCheckMs = now;
    }

    switch (state) {
        case STATE_IDLE: {
            // Time to start a new measurement prompt?
            if ((long)(now - nextMeasurementDueMs) >= 0) {
                // Enforce time-of-day window (if time is valid)
                if (!isInMeasurementWindow()) {
                    // Outside window: skip and schedule next attempt
                    nextMeasurementDueMs = now + MEAS_INTERVAL_MS;
                    return;
                }

                Serial.println("\n=== Time for a new measurement ===");
                Serial.println("Please place your finger on the sensor.");

                promptStartMs = now;
                startPromptLed();
                state = STATE_PROMPT_WAIT_FINGER;

                // Schedule the *next* cycle based on fixed interval anchor
                // (prompt/measurement duration does not shift the schedule)
                nextMeasurementDueMs = now + MEAS_INTERVAL_MS;
            }
            return;
        }

        case STATE_PROMPT_WAIT_FINGER: {
            // Timeout if no finger within the prompt window
            if (now - promptStartMs >= PROMPT_TIMEOUT_MS) {
                Serial.println("Measurement timed out (no finger detected).");
                stopPromptLed();
                state = STATE_IDLE;
                return;
            }

            // Check sensor for finger presence without blocking
            if (fingerOnSensor()) {
                Serial.println("Finger detected. Measuring now...");
                stopPromptLed();
                state = STATE_MEASURE_BLOCKING;
            }
            return;
        }

        case STATE_MEASURE_BLOCKING: {
            // Keep this blocking for safety/accuracy (collect 100 samples, run algorithm)
            takeMeasurement(&spo2, &heartRate);

            Serial.printf("Result: SpO2 = %ld, HR = %ld\r\n", spo2, heartRate);

            float spo2Val      = (float)spo2;
            float heartRateVal = (float)heartRate;

            // Timestamp for this measurement (may be 0 if time isn't valid yet)
            uint32_t ts = (uint32_t)Time.now();

            // Online vs offline handling
            if (isOnline()) {
                // If we have offline records, upload them first (non-blocking pacing),
                // then publish the current measurement.
                if (storedCount > 0) {
                    Serial.println("Online. Will upload offline measurements first (non-blocking pacing), then publish current.");

                    pendingPublishCurrent = true;
                    pendingSpO2 = spo2Val;
                    pendingHR = heartRateVal;
                    pendingTs = ts;

                    // Start offline upload state machine
                    state = STATE_UPLOAD_OFFLINE_NONBLOCKING;
                    uploadIndex = 0;
                    offlineAllOk = true;
                    nextOfflinePublishAllowedMs = now; // allow first publish immediately
                    lastOfflineUploadCheckMs = now;
                } else {
                    // No offline data: publish immediately
                    Serial.println("Online. Publishing current measurement now...");
                    bool ok = publishMeasurement(spo2Val, heartRateVal, ts);
                    Serial.printlnf("  -> publish %s", ok ? "OK" : "FAILED");

                    if (ok) {
                        startOkLed();
                    } else {
                        // If publish fails unexpectedly, store offline to avoid losing the reading
                        Serial.println("Publish failed, storing current measurement offline (EEPROM).");
                        saveOfflineMeasurement(spo2Val, heartRateVal);
                        startOfflineLed();
                    }

                    state = STATE_IDLE;
                }
            } else {
                // Offline: store locally
                Serial.println("Wi-Fi NOT ready. Storing measurement offline (EEPROM).");
                saveOfflineMeasurement(spo2Val, heartRateVal);
                startOfflineLed();
                state = STATE_IDLE;
            }
            return;
        }

        case STATE_UPLOAD_OFFLINE_NONBLOCKING: {
            // If we go offline mid-upload, abort and retry later
            if (!isOnline()) {
                Serial.println("Went offline during offline upload. Keeping EEPROM data for retry.");
                state = STATE_IDLE;
                pendingPublishCurrent = false; // current publish will happen next cycle
                return;
            }

            // Nothing to upload
            if (storedCount <= 0) {
                // If a current measurement was pending, publish it now
                if (pendingPublishCurrent) {
                    Serial.println("No offline data after all. Publishing pending current measurement...");
                    bool ok = publishMeasurement(pendingSpO2, pendingHR, pendingTs);
                    Serial.printlnf("  -> publish %s", ok ? "OK" : "FAILED");

                    if (ok) {
                        startOkLed();
                    } else {
                        Serial.println("Publish failed, storing current measurement offline (EEPROM).");
                        saveOfflineMeasurement(pendingSpO2, pendingHR);
                        startOfflineLed();
                    }
                    pendingPublishCurrent = false;
                }

                state = STATE_IDLE;
                return;
            }

            // Pace publishes to avoid rate limiting (replaces delay(2000))
            if ((long)(now - nextOfflinePublishAllowedMs) < 0) {
                return; // wait until allowed
            }

            // Finished iterating through all stored records
            if (uploadIndex >= storedCount) {
                // Clear EEPROM only if every publish attempt returned OK
                if (offlineAllOk) {
                    clearOfflineStorage();
                } else {
                    Serial.println("Some offline publishes failed, keeping EEPROM data for retry.");
                }

                // After offline upload attempts, publish the current measurement if pending
                if (pendingPublishCurrent) {
                    Serial.println("Publishing pending current measurement after offline upload...");
                    bool ok = publishMeasurement(pendingSpO2, pendingHR, pendingTs);
                    Serial.printlnf("  -> publish %s", ok ? "OK" : "FAILED");

                    if (ok) {
                        startOkLed();
                    } else {
                        Serial.println("Publish failed, storing current measurement offline (EEPROM).");
                        saveOfflineMeasurement(pendingSpO2, pendingHR);
                        startOfflineLed();
                    }
                    pendingPublishCurrent = false;
                }

                state = STATE_IDLE;
                return;
            }

            // Load one record and try to publish it (or skip if stale)
            int addr = EEPROM_START + uploadIndex * sizeof(StoredMeasurement);
            StoredMeasurement m;
            EEPROM.get(addr, m);

            // Apply 24-hour retention only if we have a trusted timestamp
            if (Time.isValid() && m.timestamp != 0) {
                time_t nowTs = Time.now();
                if (nowTs >= (time_t)m.timestamp) {
                    time_t age = nowTs - (time_t)m.timestamp;
                    if (age > (time_t)MAX_OFFLINE_AGE_SEC) {
                        Serial.printlnf("Skipping stale offline measurement (age: %ld sec)", (long)age);
                        uploadIndex++;
                        return;
                    }
                }
            }

            // Choose timestamp to send
            uint32_t sendTs;
            if (m.timestamp != 0) {
                sendTs = m.timestamp;
            } else if (Time.isValid()) {
                sendTs = (uint32_t)Time.now();
            } else {
                sendTs = 0;
            }

            Serial.printlnf("Publishing offline measurement %d/%d...", uploadIndex + 1, storedCount);
            bool ok = publishMeasurement(m.spo2, m.heartRate, sendTs);
            Serial.printlnf("  -> publish %s", ok ? "OK" : "FAILED");

            if (!ok) {
                offlineAllOk = false;
            }

            // Next publish allowed after 2 seconds
            nextOfflinePublishAllowedMs = now + 2000;

            uploadIndex++;
            return;
        }

        default:
            state = STATE_IDLE;
            return;
    }
}

// ====================== Finger Detection ======================
bool fingerOnSensor() {
    particleSensor.check();
    if (particleSensor.available()) {
        long ir = particleSensor.getIR();
        particleSensor.nextSample();

        // Threshold can be tuned; with a finger, IR is usually much higher.
        return ir > 50000;
    }
    return false;
}

// ====================== Active Measurement ======================
void takeMeasurement(int32_t *spo2Out, int32_t *hrOut) {
    for (int i = 0; i < MAX_READINGS; i++) {
        while (!particleSensor.available()) {
            particleSensor.check();
        }

        redBuffer[i] = particleSensor.getRed();
        irBuffer[i]  = particleSensor.getIR();
        particleSensor.nextSample();
    }

    // Call the official MAXIM algorithm
    maxim_heart_rate_and_oxygen_saturation(
        irBuffer, MAX_READINGS,
        redBuffer,
        spo2Out, &validSPO2,
        hrOut, &validHeartRate
    );

    if (!validSPO2 || !validHeartRate) {
        Serial.println("Warning: measurement marked as INVALID by algorithm.");
    }
}

// ====================== Offline Storage (EEPROM) ======================

// Load storedCount from EEPROM (called in setup)
void loadOfflineMetadata() {
    EEPROM.get(EEPROM_COUNT_ADDR, storedCount);
    if (storedCount < 0 || storedCount > MAX_STORED) {
        storedCount = 0;
    }
    Serial.printlnf("Offline measurements stored in EEPROM: %d", storedCount);
}

// Save storedCount to EEPROM
void saveOfflineCount() {
    EEPROM.put(EEPROM_COUNT_ADDR, storedCount);
}

// Save a single measurement into EEPROM
void saveOfflineMeasurement(float spo2Val, float hrVal) {
    if (storedCount >= MAX_STORED) {
        Serial.println("Offline storage FULL, dropping newest measurement.");
        return;
    }

    StoredMeasurement m;
    m.spo2      = spo2Val;
    m.heartRate = hrVal;

    // Store the current system time when the measurement is taken.
    // If the clock is not valid yet, this may be 0 or a bogus value.
    m.timestamp = (uint32_t)Time.now();

    int addr = EEPROM_START + storedCount * sizeof(StoredMeasurement);
    EEPROM.put(addr, m);

    storedCount++;
    saveOfflineCount();

    Serial.printlnf("Offline measurement saved. Count = %d", storedCount);
}

// Clear all offline records in EEPROM
void clearOfflineStorage() {
    Serial.println("Clearing all offline measurements from EEPROM...");

    StoredMeasurement blank;
    blank.timestamp = 0;
    blank.spo2      = 0.0f;
    blank.heartRate = 0.0f;

    for (int i = 0; i < storedCount; i++) {
        int addr = EEPROM_START + i * sizeof(StoredMeasurement);
        EEPROM.put(addr, blank);
    }

    storedCount = 0;
    saveOfflineCount();
}

// ====================== Config Function (time window) ======================
// command format: "startHour,endHour", e.g. "6,22"
int setMeasurementWindow(String command) {
    int comma = command.indexOf(',');
    if (comma < 0) {
        return -1;  // invalid format
    }

    int startH = command.substring(0, comma).toInt();
    int endH   = command.substring(comma + 1).toInt();

    if (startH < 0 || startH > 23 || endH < 1 || endH > 24) {
        return -2;  // out of range
    }

    measurementStartHour = startH;
    measurementEndHour   = endH;

    Serial.printlnf("Updated measurement window to [%d:00, %d:00).",
                    measurementStartHour, measurementEndHour);
    return 1;
}