/******************************************************/
//       THIS IS A GENERATED FILE - DO NOT EDIT       //
/******************************************************/

#line 1 "c:/Users/Ricardo/Desktop/ECE513~1/FINALP~1/Heart-Rate-Monitor/513_final_project/src/513_final_project.ino"
#include "Particle.h"
#include "MAX30105.h"
#include "heartRate.h"
#include "spo2_algorithm.h"

void setup();
void loop();
#line 6 "c:/Users/Ricardo/Desktop/ECE513~1/FINALP~1/Heart-Rate-Monitor/513_final_project/src/513_final_project.ino"
SYSTEM_MODE(AUTOMATIC);
SYSTEM_THREAD(ENABLED);

MAX30105 particleSensor;

// Number of samples per measurement
const int MAX_READINGS = 100;
uint32_t irBuffer[MAX_READINGS];
uint32_t redBuffer[MAX_READINGS];

int32_t spo2;
int8_t  validSPO2;
int32_t heartRate;
int8_t  validHeartRate;

// Fixed schedule for milestone
// TESTING: 30 minutes.
// For testing use 30 seconds
// const unsigned long MEAS_INTERVAL_MS  = 30UL * 60UL * 1000UL; // 30 minutes (real)
const unsigned long MEAS_INTERVAL_MS  = 30000; // 30 seconds for testing


const unsigned long PROMPT_TIMEOUT_MS = 5UL * 60UL * 1000UL;   // 5 minutes

unsigned long lastMeasurementTime = 0;

// Function declarations
void takeMeasurement(int32_t *spo2Out, int32_t *hrOut);
bool fingerOnSensor();
void flashBluePrompt();
void flashGreenOK();
void flashErrorPurple();

void setup() {
    Serial.begin(115200);
    // Wait up to 10 seconds so the PC serial monitor can attach
    waitFor(Serial.isConnected, 10000);

    RGB.control(true);
    pinMode(D7, OUTPUT);

    // Initialize sensor
    if (!particleSensor.begin(Wire, I2C_SPEED_FAST)) {
        Serial.println("MAX30105 not found! Check wiring and power.");
        flashErrorPurple();      // Blink purple forever to show error
        while (true) {
            // Stay here until the hardware issue is fixed
        }
    }

    // Default sensor configuration
    particleSensor.setup();
    particleSensor.setPulseAmplitudeRed(0x0A);   // Low red brightness
    particleSensor.setPulseAmplitudeGreen(0x00); // Turn off green LED

    Serial.println("HeartTrack Milestone firmware ready.");
    Serial.println("Device will ask for a measurement on a fixed schedule.");

    // Force the first measurement to happen soon after boot
    lastMeasurementTime = millis() - MEAS_INTERVAL_MS;
}

void loop() {
    unsigned long now = millis();

    // Time to request a new measurement
    if (now - lastMeasurementTime >= MEAS_INTERVAL_MS) {
        Serial.println("\n=== Time for a new measurement ===");
        Serial.println("Please place your finger on the sensor.");

        unsigned long promptStart = millis();

        // During this window, blink blue and wait for the user
        while (millis() - promptStart < PROMPT_TIMEOUT_MS) {
            flashBluePrompt();          // Blue LED prompt

            // Check if finger is on the sensor (look at IR strength)
            if (fingerOnSensor()) {
                Serial.println("Finger detected. Measuring now...");

                takeMeasurement(&spo2, &heartRate);

                Serial.printf("Result: SpO2 = %ld, HR = %ld\r\n", spo2, heartRate);

                // Send to server: event name HeartTrack, JSON payload
                String payload = String::format(
                    "{\"spo2\":%ld,\"heartRate\":%ld}", spo2, heartRate
                );
                Particle.publish("HeartTrack", payload, PRIVATE);

                flashGreenOK();         // Green LED = measurement done

                lastMeasurementTime = millis();  // Reset the schedule
                return;                           // End this loop iteration
            }
        }

        // Timed out (no finger detected)
        Serial.println("Measurement timed out (no finger detected).");
        lastMeasurementTime = millis();  // Start a new interval
    }
}

// Check once if a finger is present based on IR intensity
bool fingerOnSensor() {
    particleSensor.check();
    if (particleSensor.available()) {
        long ir = particleSensor.getIR();
        particleSensor.nextSample();

        // Threshold can be tuned; with a finger, IR is usually much higher
        return ir > 50000;
    }
    return false;
}

// Collect MAX_READINGS samples and compute SpO2 + HR
void takeMeasurement(int32_t *spo2Out, int32_t *hrOut) {
    for (int i = 0; i < MAX_READINGS; i++) {
        while (!particleSensor.available()) {
            particleSensor.check();
        }

        redBuffer[i] = particleSensor.getRed();
        irBuffer[i]  = particleSensor.getIR();
        particleSensor.nextSample();
    }

    // Call the official algorithm
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

// Blue LED prompt (and on-board D7 LED)
void flashBluePrompt() {
    digitalWrite(D7, HIGH);
    RGB.color(0, 0, 255);   // Blue
    delay(200);
    digitalWrite(D7, LOW);
    RGB.color(0, 0, 0);
    delay(200);
}

// Measurement success: blink green a few times
void flashGreenOK() {
    for (int i = 0; i < 3; i++) {
        RGB.color(0, 255, 0); // Green
        delay(200);
        RGB.color(0, 0, 0);
        delay(200);
    }
}

// Sensor not found: blink purple forever
void flashErrorPurple() {
    while (true) {
        RGB.color(255, 0, 255); // Purple
        delay(300);
        RGB.color(0, 0, 0);
        delay(300);
    }
}