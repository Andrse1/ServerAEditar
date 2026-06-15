// ============================================================================
//  sistema_riego_datalogger.ino
//  ESP32 del Sistema de Riego + envio al Datalogger via ESP-NOW
//
//  Hardware:
//    - RS485 (UART2) para sensor de suelo y NPK
//    - DHT11 para temperatura/humedad ambiente
//    - ESP-NOW para enviar datos al datalogger central
//
//  IDs asignados (deben coincidir con EspPost.php):
//    40 = temperatura_suelo   (RS485)
//    41 = temperatura_ambiente (DHT11)
//    42 = humedad_ambiente     (DHT11)
//    43 = humedad_suelo        (RS485)
//    44 = potasio (K)          (RS485 NPK)
//    45 = fosforo (P)          (RS485 NPK)
//    46 = nitrogeno (N)        (RS485 NPK)
//
//  Formato enviado al datalogger:
//    id_grupo=40&valor1=23.5&fecha_lectura=YYYY-MM-DD&hora_lectura=HH:MM:SS
//
//  El datalogger recibe por ESP-NOW y reenvia por HTTP POST a EspPost.php
// ============================================================================

#include <HardwareSerial.h>
#include <DHT.h>
#include <WiFi.h>
#include <esp_now.h>

// ── RS485 pins ──
#define RXD2 16
#define TXD2 17
#define DERE 14

// ── DHT11 ──
#define DHTPIN 4
#define DHTTYPE DHT11

HardwareSerial RS485(2);
DHT dht(DHTPIN, DHTTYPE);

// ── Frames Modbus ──
uint8_t frameHT[]  = { 0x01, 0x03, 0x00, 0x12, 0x00, 0x02, 0x64, 0x0E };
uint8_t frameNPK[] = { 0x01, 0x03, 0x00, 0x1E, 0x00, 0x03, 0x65, 0xCD };

// ── IDs para el datalogger ──
#define ID_TEMP_SUELO       40
#define ID_TEMP_AMBIENTE    41
#define ID_HUM_AMBIENTE     42
#define ID_HUM_SUELO        43
#define ID_POTASIO          44
#define ID_FOSFORO          45
#define ID_NITROGENO        46

// ── Estructura ESP-NOW (debe coincidir con el datalogger) ──
typedef struct struct_message {
  int   id_grupo;
  float valor1;
  float valor2;
} struct_message;

struct_message datoEnvio;

// ── MAC del datalogger central (cambiar por la real) ──
uint8_t macDatalogger[] = { 0x00, 0x00, 0x00, 0x00, 0x00, 0x00 };

// ── Variables de lectura ──
float tempSuelo      = 0;
float humSuelo       = 0;
float tempAmbiente   = 0;
float humAmbiente    = 0;
float nitrogenoVal   = 0;
float fosforoVal     = 0;
float potasioVal     = 0;

// ── NTP para fecha/hora ──
const char* ntpServer = "time.google.com";
const long  gmtOffset = -18000;
const int   daylight  = 0;

void sendModbus(uint8_t *frame, int len) {
  while (RS485.available()) RS485.read();
  digitalWrite(DERE, HIGH);
  RS485.write(frame, len);
  RS485.flush();
  digitalWrite(DERE, LOW);
}

void enviarDato(int id, float valor) {
  datoEnvio.id_grupo = id;
  datoEnvio.valor1   = valor;
  datoEnvio.valor2   = 0;

  esp_err_t result = esp_now_send(macDatalogger, (uint8_t *)&datoEnvio, sizeof(datoEnvio));

  if (result == ESP_OK) {
    Serial.printf("[OK] Enviado ID=%d valor=%.2f\n", id, valor);
  } else {
    Serial.printf("[ERROR] ID=%d code=%d\n", id, result);
  }

  delay(150);  // Pequena pausa entre envios
}

String getFecha() {
  struct tm timeinfo;
  if (!getLocalTime(&timeinfo)) return "1970-01-01";
  char buf[11];
  strftime(buf, sizeof(buf), "%Y-%m-%d", &timeinfo);
  return String(buf);
}

String getHora() {
  struct tm timeinfo;
  if (!getLocalTime(&timeinfo)) return "00:00:00";
  char buf[9];
  strftime(buf, sizeof(buf), "%H:%M:%S", &timeinfo);
  return String(buf);
}

void setup() {
  Serial.begin(115200);

  // ── RS485 ──
  pinMode(DERE, OUTPUT);
  digitalWrite(DERE, LOW);
  RS485.begin(9600, SERIAL_8N1, RXD2, TXD2);

  // ── DHT ──
  dht.begin();

  // ── WiFi (requerido para ESP-NOW) ──
  WiFi.mode(WIFI_STA);
  WiFi.disconnect();

  // ── ESP-NOW ──
  if (esp_now_init() != ESP_OK) {
    Serial.println("Error ESP-NOW");
    return;
  }

  // Registrar peer (datalogger)
  esp_now_peer_info_t peerInfo = {};
  memcpy(peerInfo.peer_addr, macDatalogger, 6);
  peerInfo.channel = 0;
  peerInfo.encrypt = false;
  if (esp_now_add_peer(&peerInfo) != ESP_OK) {
    Serial.println("Error agregando peer");
    return;
  }

  // ── NTP ──
  configTime(gmtOffset, daylight, ntpServer);

  Serial.println("Sistema de Riego iniciado");
  Serial.println("=========================");
  Serial.println("IDs asignados:");
  Serial.println("  40 = temperatura_suelo (RS485)");
  Serial.println("  41 = temperatura_ambiente (DHT11)");
  Serial.println("  42 = humedad_ambiente (DHT11)");
  Serial.println("  43 = humedad_suelo (RS485)");
  Serial.println("  44 = potasio (RS485 NPK)");
  Serial.println("  45 = fosforo (RS485 NPK)");
  Serial.println("  46 = nitrogeno (RS485 NPK)");
  Serial.println("=========================");
}

void loop() {
  // ============================================================
  // 1) LEER SENSORES
  // ============================================================

  // --- Humedad + Temperatura del SUELO (RS485) ---
  sendModbus(frameHT, sizeof(frameHT));
  delay(100);
  if (RS485.available() >= 9) {
    uint8_t resp[9];
    for (int i = 0; i < 9; i++) resp[i] = RS485.read();

    int humedadRaw      = (resp[3] << 8) | resp[4];
    int temperaturaRaw  = (resp[5] << 8) | resp[6];

    humSuelo  = humedadRaw / 10.0;
    tempSuelo = temperaturaRaw / 10.0;

    Serial.printf("Suelo -> Hum: %.1f%%  Temp: %.1fC\n", humSuelo, tempSuelo);
  }

  // --- NPK (RS485) ---
  sendModbus(frameNPK, sizeof(frameNPK));
  delay(100);
  if (RS485.available() >= 11) {
    uint8_t resp[11];
    for (int i = 0; i < 11; i++) resp[i] = RS485.read();

    nitrogenoVal = (resp[3] << 8) | resp[4];
    fosforoVal   = (resp[5] << 8) | resp[6];
    potasioVal   = (resp[7] << 8) | resp[8];

    Serial.printf("NPK -> N: %.0f  P: %.0f  K: %.0f mg/kg\n", nitrogenoVal, fosforoVal, potasioVal);
  }

  // --- DHT11 (Ambiente) ---
  float h = dht.readHumidity();
  float t = dht.readTemperature();
  if (!isnan(h) && !isnan(t)) {
    humAmbiente  = h;
    tempAmbiente = t;
    Serial.printf("Ambiente -> Hum: %.1f%%  Temp: %.1fC\n", humAmbiente, tempAmbiente);
  } else {
    Serial.println("DHT11 -> Error de lectura");
  }

  Serial.println("-------------------------");

  // ============================================================
  // 2) ENVIAR AL DATALOGGER POR ESP-NOW
  // ============================================================
  // El datalogger recibe: struct { int id; float v1; float v2; }
  // y lo convierte a: id_grupo=XX&valor1=YY&fecha_lectura=...&hora_lectura=...

  enviarDato(ID_TEMP_SUELO,    tempSuelo);
  enviarDato(ID_TEMP_AMBIENTE, tempAmbiente);
  enviarDato(ID_HUM_AMBIENTE,  humAmbiente);
  enviarDato(ID_HUM_SUELO,     humSuelo);
  enviarDato(ID_POTASIO,       potasioVal);
  enviarDato(ID_FOSFORO,       fosforoVal);
  enviarDato(ID_NITROGENO,     nitrogenoVal);

  Serial.println("[INFO] Ciclo completo. Esperando 10 segundos...\n");
  delay(10000);
}
