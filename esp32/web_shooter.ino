// ═══════════════════════════════════════════════════════════════
//  Web Shooter — ESP32 Firmware
//  Hardware: ESP32 dev board + push button
//
//  What it does:
//    1. Connects to your WiFi
//    2. When button is pressed → HTTP POST to the bridge server
//    3. Bridge server forwards the "shoot" event to the browser game
//
//  Wiring:
//    Button → GPIO 0  (or change BUTTON_PIN below)
//            → GND
//    (use INPUT_PULLUP — no external resistor needed)
//
//  Required Libraries (install via Arduino Library Manager):
//    - WiFi       (built-in with ESP32 board package)
//    - HTTPClient (built-in with ESP32 board package)
// ═══════════════════════════════════════════════════════════════

#include <WiFi.h>
#include <HTTPClient.h>

// ─── CONFIGURE THESE ─────────────────────────────────────────

const char* WIFI_SSID     = "YOUR_WIFI_SSID";       // ← your WiFi name
const char* WIFI_PASSWORD = "YOUR_WIFI_PASSWORD";   // ← your WiFi password

// Copy the IP printed by the bridge server when you run: node backend/server.js
const char* SERVER_IP   = "192.168.1.100";           // ← your computer's local IP
const int   SERVER_PORT = 3001;

// GPIO pin the button is connected to (other leg → GND)
// GPIO 0 = built-in BOOT button on most ESP32 dev boards (great for testing)
const int BUTTON_PIN = 0;

// Optional: onboard LED pin for visual feedback
// Most ESP32 dev boards have LED on GPIO 2. Set to -1 to disable.
const int LED_PIN = 2;

// ─────────────────────────────────────────────────────────────

String shootURL;

// Debounce state
bool          lastButtonState  = HIGH;
bool          stableState      = HIGH;
unsigned long lastDebounceTime = 0;
const unsigned long DEBOUNCE_MS = 50;

// Shot cooldown — prevent accidental double-fires
unsigned long lastShotTime  = 0;
const unsigned long COOLDOWN_MS = 300;

// WiFi reconnect
unsigned long lastWiFiCheck = 0;
const unsigned long WIFI_CHECK_INTERVAL = 5000;

// ─────────────────────────────────────────────────────────────

void setup() {
  Serial.begin(115200);
  delay(500);

  Serial.println("\n╔══════════════════════════════════════════╗");
  Serial.println("║    🕸  WEB SHOOTER — ESP32 DEVICE  🕸    ║");
  Serial.println("╚══════════════════════════════════════════╝");

  // Button: active LOW with internal pull-up
  pinMode(BUTTON_PIN, INPUT_PULLUP);

  // LED
  if (LED_PIN >= 0) {
    pinMode(LED_PIN, OUTPUT);
    digitalWrite(LED_PIN, LOW);
  }

  // Build shoot URL once
  shootURL = "http://" + String(SERVER_IP) + ":" + String(SERVER_PORT) + "/shoot";
  Serial.println("Shoot URL: " + shootURL);

  connectWiFi();
}

// ─────────────────────────────────────────────────────────────

void loop() {
  // WiFi watchdog — reconnect if dropped
  if (millis() - lastWiFiCheck > WIFI_CHECK_INTERVAL) {
    lastWiFiCheck = millis();
    if (WiFi.status() != WL_CONNECTED) {
      Serial.println("[WiFi] Lost connection — reconnecting...");
      connectWiFi();
    }
  }

  // Read button with debounce
  bool reading = digitalRead(BUTTON_PIN);

  if (reading != lastButtonState) {
    lastDebounceTime = millis();
  }

  if (millis() - lastDebounceTime > DEBOUNCE_MS) {
    if (reading != stableState) {
      stableState = reading;

      // Button PRESSED (LOW = pressed with INPUT_PULLUP)
      if (stableState == LOW) {
        unsigned long now = millis();
        if (now - lastShotTime > COOLDOWN_MS) {
          lastShotTime = now;
          Serial.println("[BUTTON] Pressed → firing web shot!");
          ledFlash(1);
          sendShoot();
        } else {
          Serial.println("[BUTTON] Cooldown active — ignoring");
        }
      }
    }
  }

  lastButtonState = reading;
}

// ─────────────────────────────────────────────────────────────

void sendShoot() {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("[HTTP] Not connected to WiFi — skipping");
    return;
  }

  HTTPClient http;
  http.begin(shootURL);
  http.addHeader("Content-Type", "application/json");
  http.setTimeout(2000);  // 2s timeout — don't block the loop

  int code = http.POST("{\"action\":\"shoot\",\"source\":\"esp32\"}");

  if (code == 200) {
    Serial.println("[HTTP] ✓ Shot sent successfully (200)");
    ledFlash(2);  // double-flash confirms server received it
  } else if (code > 0) {
    Serial.printf("[HTTP] Server responded with code: %d\n", code);
  } else {
    Serial.printf("[HTTP] Request failed: %s\n", http.errorToString(code).c_str());
  }

  http.end();
}

void connectWiFi() {
  Serial.printf("[WiFi] Connecting to %s", WIFI_SSID);
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 20) {
    delay(500);
    Serial.print(".");
    attempts++;
  }

  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("\n[WiFi] ✓ Connected!");
    Serial.println("[WiFi] IP address: " + WiFi.localIP().toString());
    ledFlash(3);
  } else {
    Serial.println("\n[WiFi] ✗ Failed to connect. Will retry...");
  }
}

void ledFlash(int times) {
  if (LED_PIN < 0) return;
  for (int i = 0; i < times; i++) {
    digitalWrite(LED_PIN, HIGH);
    delay(80);
    digitalWrite(LED_PIN, LOW);
    if (i < times - 1) delay(80);
  }
}
