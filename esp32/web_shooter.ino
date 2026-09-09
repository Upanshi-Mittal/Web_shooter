// ═══════════════════════════════════════════════════════════════
//  Web Shooter V2 — ESP32 Firmware (Button + MPU-6050 IMU)
//
//  Hardware:
//    - ESP32 Dev Module
//    - Push Button (Active LOW: Pin -> Button -> GND)
//    - MPU-6050 (6-DOF Accel + Gyro on I2C)
//
//  Wiring:
//    MPU-6050 VCC  --> 3.3V (or 5V depending on board)
//    MPU-6050 GND  --> GND
//    MPU-6050 SDA  --> GPIO 21
//    MPU-6050 SCL  --> GPIO 22
//    Push Button   --> GPIO 0  (or set BUTTON_PIN below)
//    Button GND    --> GND
//
//  Features:
//    1. Button Press -> HTTP POST /shoot
//    2. MPU-6050 Tilt Tracking -> HTTP POST /imu (Pitch & Roll)
//    3. Wrist Flick / Thrust Gesture Detection -> Auto-shoot
// ═══════════════════════════════════════════════════════════════

#include <WiFi.h>
#include <HTTPClient.h>
#include <Wire.h>

// ─── CONFIGURE YOUR NETWORK ──────────────────────────────────
const char* WIFI_SSID     = "YOUR_WIFI_SSID";       // ← your WiFi name
const char* WIFI_PASSWORD = "YOUR_WIFI_PASSWORD";   // ← your WiFi password

// Server IP printed by: node backend/server.js
const char* SERVER_IP   = "172.16.86.163";          // ← your computer's local IP
const int   SERVER_PORT = 3001;

// Hardware Pins
const int BUTTON_PIN = 0;   // BOOT button or external push button
const int LED_PIN    = 2;   // Onboard LED (-1 to disable)
const int SDA_PIN    = 21;  // I2C Data
const int SCL_PIN    = 22;  // I2C Clock

// MPU-6050 I2C Address (default 0x68)
const uint8_t MPU_ADDR = 0x68;

// Gesture Sensitivity
const float FLICK_G_THRESHOLD = 2.4;  // G-force spike for flick shot
const unsigned long FLICK_COOLDOWN_MS = 600;

// Timing
const unsigned long IMU_INTERVAL_MS   = 60;   // Stream IMU data every 60ms (~16Hz)
const unsigned long COOLDOWN_MS       = 300;  // Button debounce cooldown

// ─────────────────────────────────────────────────────────────
String shootURL;
String imuURL;

bool mpuAvailable = false;
bool lastButtonState  = HIGH;
bool stableState      = HIGH;
unsigned long lastDebounceTime = 0;
const unsigned long DEBOUNCE_MS = 40;

unsigned long lastShotTime   = 0;
unsigned long lastFlickTime  = 0;
unsigned long lastIMUSend    = 0;
unsigned long lastWiFiCheck  = 0;

// Filtered tilt values
float pitch = 0.0;
float roll  = 0.0;

// ─── SETUP ───────────────────────────────────────────────────
void setup() {
  Serial.begin(115200);
  delay(500);

  Serial.println("\n╔══════════════════════════════════════════════════╗");
  Serial.println("║    🕸  WEB SHOOTER V2 — ESP32 + MPU6050  🕸       ║");
  Serial.println("╚══════════════════════════════════════════════════╝");

  pinMode(BUTTON_PIN, INPUT_PULLUP);
  if (LED_PIN >= 0) {
    pinMode(LED_PIN, OUTPUT);
    digitalWrite(LED_PIN, LOW);
  }

  // URLs
  shootURL = "http://" + String(SERVER_IP) + ":" + String(SERVER_PORT) + "/shoot";
  imuURL   = "http://" + String(SERVER_IP) + ":" + String(SERVER_PORT) + "/imu";

  // Init I2C and MPU-6050
  Wire.begin(SDA_PIN, SCL_PIN, 400000); // 400kHz Fast I2C
  initMPU6050();

  connectWiFi();
}

// ─── INITIALIZE MPU-6050 (Direct Register Access) ────────────
void initMPU6050() {
  Wire.beginTransmission(MPU_ADDR);
  Wire.write(0x6B); // PWR_MGMT_1 register
  Wire.write(0x00); // Set to 0 to wake up MPU-6050
  byte err = Wire.endTransmission();

  if (err == 0) {
    mpuAvailable = true;
    Serial.println("[MPU6050] ✓ Sensor detected and initialized on I2C (0x68)");
  } else {
    mpuAvailable = false;
    Serial.printf("[MPU6050] ✗ Sensor not found on I2C (error %d). Check wiring!\n", err);
  }
}

// ─── MAIN LOOP ───────────────────────────────────────────────
void loop() {
  // 1. WiFi watchdog
  if (millis() - lastWiFiCheck > 5000) {
    lastWiFiCheck = millis();
    if (WiFi.status() != WL_CONNECTED) {
      Serial.println("[WiFi] Connection lost, reconnecting...");
      connectWiFi();
    }
  }

  // 2. Read button with debounce
  bool reading = digitalRead(BUTTON_PIN);
  if (reading != lastButtonState) {
    lastDebounceTime = millis();
  }
  if (millis() - lastDebounceTime > DEBOUNCE_MS) {
    if (reading != stableState) {
      stableState = reading;
      if (stableState == LOW) { // Pressed (pull-up)
        unsigned long now = millis();
        if (now - lastShotTime > COOLDOWN_MS) {
          lastShotTime = now;
          Serial.println("[BUTTON] Triggered -> Fire Web!");
          ledFlash(1);
          sendShoot("button");
        }
      }
    }
  }
  lastButtonState = reading;

  // 3. Read and Process MPU-6050
  if (mpuAvailable) {
    int16_t rawAx, rawAy, rawAz, rawGx, rawGy, rawGz;
    if (readRawMPU(rawAx, rawAy, rawAz, rawGx, rawGy, rawGz)) {
      // Convert to Gs and deg/s
      float ax = rawAx / 16384.0;
      float ay = rawAy / 16384.0;
      float az = rawAz / 16384.0;

      // Acceleration magnitude
      float totalG = sqrt(ax * ax + ay * ay + az * az);

      // Flick gesture detection (sudden wrist snap forward)
      unsigned long now = millis();
      if (totalG > FLICK_G_THRESHOLD && (now - lastFlickTime > FLICK_COOLDOWN_MS)) {
        lastFlickTime = now;
        Serial.printf("[GESTURE] ⚡ Flick detected (%.2f G)! Firing Web!\n", totalG);
        ledFlash(2);
        sendShoot("gesture");
      }

      // Calculate tilt angles (Pitch & Roll in degrees)
      float calcPitch = atan2(-ax, sqrt(ay * ay + az * az)) * 180.0 / PI;
      float calcRoll  = atan2(ay, az) * 180.0 / PI;

      // Low pass filter
      pitch = 0.8 * pitch + 0.2 * calcPitch;
      roll  = 0.8 * roll  + 0.2 * calcRoll;

      // Send periodic IMU telemetry
      if (now - lastIMUSend > IMU_INTERVAL_MS) {
        lastIMUSend = now;
        sendIMU(pitch, roll, ax, ay, az);
      }
    }
  }
}

// ─── READ RAW MPU6050 SENSOR REGISTERS ───────────────────────
bool readRawMPU(int16_t &ax, int16_t &ay, int16_t &az, int16_t &gx, int16_t &gy, int16_t &gz) {
  Wire.beginTransmission(MPU_ADDR);
  Wire.write(0x3B); // Starting at register 0x3B (ACCEL_XOUT_H)
  if (Wire.endTransmission(false) != 0) return false;

  Wire.requestFrom(MPU_ADDR, (uint8_t)14, (uint8_t)true);
  if (Wire.available() < 14) return false;

  ax = (Wire.read() << 8) | Wire.read();
  ay = (Wire.read() << 8) | Wire.read();
  az = (Wire.read() << 8) | Wire.read();
  Wire.read(); Wire.read(); // Skip temperature bytes
  gx = (Wire.read() << 8) | Wire.read();
  gy = (Wire.read() << 8) | Wire.read();
  gz = (Wire.read() << 8) | Wire.read();
  return true;
}

// ─── SEND SHOOT EVENT ────────────────────────────────────────
void sendShoot(const char* source) {
  if (WiFi.status() != WL_CONNECTED) return;

  HTTPClient http;
  http.begin(shootURL);
  http.addHeader("Content-Type", "application/json");
  http.setTimeout(1500);

  String payload = "{\"action\":\"shoot\",\"source\":\"" + String(source) + "\"}";
  int code = http.POST(payload);
  http.end();
}

// ─── SEND IMU TELEMETRY ──────────────────────────────────────
void sendIMU(float p, float r, float ax, float ay, float az) {
  if (WiFi.status() != WL_CONNECTED) return;

  HTTPClient http;
  http.begin(imuURL);
  http.addHeader("Content-Type", "application/json");
  http.setTimeout(300); // Very fast timeout so it never stalls loop

  String payload = "{\"pitch\":" + String(p, 1) +
                   ",\"roll\":" + String(r, 1) +
                   ",\"ax\":" + String(ax, 2) +
                   ",\"ay\":" + String(ay, 2) +
                   ",\"az\":" + String(az, 2) +
                   ",\"source\":\"imu\"}";
  http.POST(payload);
  http.end();
}

// ─── WIFI CONNECTION ─────────────────────────────────────────
void connectWiFi() {
  Serial.printf("[WiFi] Connecting to: %s", WIFI_SSID);
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  int tries = 0;
  while (WiFi.status() != WL_CONNECTED && tries < 20) {
    delay(400);
    Serial.print(".");
    tries++;
  }

  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("\n[WiFi] ✓ Connected! IP: " + WiFi.localIP().toString());
    ledFlash(3);
  } else {
    Serial.println("\n[WiFi] ✗ Connect timeout. Will retry in background...");
  }
}

void ledFlash(int times) {
  if (LED_PIN < 0) return;
  for (int i = 0; i < times; i++) {
    digitalWrite(LED_PIN, HIGH);
    delay(70);
    digitalWrite(LED_PIN, LOW);
    if (i < times - 1) delay(70);
  }
}
