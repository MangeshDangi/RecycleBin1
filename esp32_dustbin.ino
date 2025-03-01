#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>

// WiFi Credentials
const char* ssid = "abhay";
const char* password = "mangesh123";

// Server Configuration - Use HTTP and correct IP/port
const char* serverURL = "http://192.168.105.72:3000/save_code";  // Update with your server's IP and port
const char* sensorId = "65c93456789abc123456789a";

// Pin Definitions
const int trigPin = 4;
const int echoPin = 2;
const int buttonPin = 5;
const int powerPin = 12;

// Constants
const int sensorDistanceThreshold = 30;  // cm
const int wifiTimeout = 20000;  // 20 seconds timeout for WiFi connection
const int httpTimeout = 5000;   // 5 seconds timeout for HTTP requests

// Function declarations
void connectToWiFi();
int measureDistance();
String generateRandomCode();
bool sendToDatabase(String code);

void setup() {
    Serial.begin(115200);
    
    // Configure pins
    pinMode(trigPin, OUTPUT);
    pinMode(echoPin, INPUT);
    pinMode(buttonPin, INPUT_PULLUP);
    pinMode(powerPin, OUTPUT);
    digitalWrite(powerPin, LOW);  // Ensure power is off initially

    // Initialize random seed
    randomSeed(analogRead(0));

    // Connect to WiFi
    connectToWiFi();
}

void loop() {
    int distance = measureDistance();
    Serial.printf("Distance: %d cm\n", distance);

    if (distance > 0 && distance <= sensorDistanceThreshold) {
        Serial.println("📡 Object Detected! Enabling button power...");
        digitalWrite(powerPin, HIGH);

        // Wait for button press with timeout
        unsigned long startTime = millis();
        while (millis() - startTime < 5000) {
            if (digitalRead(buttonPin) == LOW) {
                Serial.println("🛑 Button Pressed!");
                String code = generateRandomCode();
                Serial.println("🔢 Generated Code: " + code);
                
                // Try to send code to server
                if (sendToDatabase(code)) {
                    Serial.println("✅ Code sent successfully!");
                } else {
                    Serial.println("❌ Failed to send code");
                }
                
                delay(1000);
                break;
            }
        }

        Serial.println("🔌 Turning off button power...");
        digitalWrite(powerPin, LOW);
    }

    delay(500);
}

void connectToWiFi() {
    Serial.println("\nConnecting to WiFi...");
    WiFi.begin(ssid, password);
    
    unsigned long startTime = millis();
    
    while (WiFi.status() != WL_CONNECTED && millis() - startTime < wifiTimeout) {
        delay(500);
        Serial.print(".");
    }
    
    if (WiFi.status() == WL_CONNECTED) {
        Serial.println("\n✅ WiFi Connected!");
        Serial.print("📱 IP Address: ");
        Serial.println(WiFi.localIP());
    } else {
        Serial.println("\n❌ WiFi Connection Failed!");
        ESP.restart();  // Restart ESP32 if WiFi connection fails
    }
}

int measureDistance() {
    digitalWrite(trigPin, LOW);
    delayMicroseconds(2);
    digitalWrite(trigPin, HIGH);
    delayMicroseconds(10);
    digitalWrite(trigPin, LOW);

    long duration = pulseIn(echoPin, HIGH);
    return duration * 0.034 / 2;
}

String generateRandomCode() {
    String code = "";
    for (int i = 0; i < 6; i++) {
        code += String(random(0, 10));
    }
    return code;
}

bool sendToDatabase(String code) {
    if (WiFi.status() != WL_CONNECTED) {
        Serial.println("📡 Reconnecting to WiFi...");
        connectToWiFi();
        if (WiFi.status() != WL_CONNECTED) {
            return false;
        }
    }

    HTTPClient http;
    http.begin(serverURL);
    http.addHeader("Content-Type", "application/json");
    http.setTimeout(httpTimeout);

    // Create JSON document
    StaticJsonDocument<200> doc;
    doc["sensorId"] = sensorId;
    doc["code"] = code;

    String jsonString;
    serializeJson(doc, jsonString);
    Serial.println("📤 Sending: " + jsonString);

    // Send POST request
    int httpCode = http.POST(jsonString);
    bool success = false;

    if (httpCode > 0) {
        if (httpCode == HTTP_CODE_OK) {
            String response = http.getString();
            Serial.println("✅ Server Response: " + response);
            success = true;
        } else {
            Serial.printf("❌ HTTP Error: %d\n", httpCode);
        }
    } else {
        Serial.printf("❌ HTTP Failed: %s\n", http.errorToString(httpCode).c_str());
    }

    http.end();
    return success;
}
