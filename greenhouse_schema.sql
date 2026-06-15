-- ============================================================
-- Greenhouse Server - Schema MySQL Completo
-- Actualizado para coincidir con el formato real del datalogger
-- Fecha: 2026-06-11
-- ============================================================

-- Crear la base de datos
CREATE DATABASE IF NOT EXISTS greenhouse CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE greenhouse;

-- ============================================================
-- Tabla de usuarios (requerida por la infraestructura backend)
-- ============================================================
CREATE TABLE IF NOT EXISTS users (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  unionId VARCHAR(255) NOT NULL UNIQUE,
  name VARCHAR(255),
  email VARCHAR(320),
  avatar TEXT,
  role ENUM('user', 'admin') NOT NULL DEFAULT 'user',
  createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  lastSignInAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- PROYECTO 1: CO2
-- ============================================================
CREATE TABLE IF NOT EXISTS co2_humedad (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  humedad FLOAT NOT NULL,
  fecha_lectura TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS co2_temperatura (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  temperatura FLOAT NOT NULL,
  fecha_lectura TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS co2_concentracion (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  co2_ppm FLOAT NOT NULL,
  fecha_lectura TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- PROYECTO 2: NEBULIZADOR
-- ============================================================
CREATE TABLE IF NOT EXISTS nebulizador_humedad (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  humedad FLOAT NOT NULL,
  fecha_lectura TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- PROYECTO 3: ILUMINACION (PhytoSense)
--
-- Formato del datalogger:
--   ID 10: ppfd_total + foco_estado  -> iluminacion_ppfd
--   ID 11: dli_total + dli_excedente -> iluminacion_dli
--   ID 12: ppfd_ch0 + ppfd_ch1       -> iluminacion_espectro (UPSERT)
--   ID 13: ppfd_ch2 + ppfd_ch3       -> iluminacion_espectro (UPSERT)
--   ID 14: ppfd_ch4 + ppfd_ch5       -> iluminacion_espectro (UPSERT)
--   ID 15: ppfd_ch6 + ppfd_ch7       -> iluminacion_espectro (UPSERT)
--   ID 16: dli_ch0  + dli_ch1        -> iluminacion_dli_canales (UPSERT)
--   ID 17: dli_ch2  + dli_ch3        -> iluminacion_dli_canales (UPSERT)
--   ID 18: dli_ch4  + dli_ch5        -> iluminacion_dli_canales (UPSERT)
--   ID 19: dli_ch6  + dli_ch7        -> iluminacion_dli_canales (UPSERT)
-- ============================================================

-- PPFD Total (ID 10)
CREATE TABLE IF NOT EXISTS iluminacion_ppfd (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  ppfd FLOAT NOT NULL,
  foco_estado FLOAT NOT NULL DEFAULT 0,
  fecha_lectura TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- DLI Total (ID 11)
-- dli_excedente en el POST = dli_bruto_total (nombre del datalogger)
CREATE TABLE IF NOT EXISTS iluminacion_dli (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  dli_total FLOAT NOT NULL,
  dli_bruto_total FLOAT NOT NULL DEFAULT 0,
  fecha_lectura TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- PPFD por canales (IDs 12-15)
-- Los canales llegan en pares: se usa UPSERT en EspPost.php
CREATE TABLE IF NOT EXISTS iluminacion_espectro (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  ch0 FLOAT NOT NULL DEFAULT 0,
  ch1 FLOAT NOT NULL DEFAULT 0,
  ch2 FLOAT NOT NULL DEFAULT 0,
  ch3 FLOAT NOT NULL DEFAULT 0,
  ch4 FLOAT NOT NULL DEFAULT 0,
  ch5 FLOAT NOT NULL DEFAULT 0,
  ch6 FLOAT NOT NULL DEFAULT 0,
  ch7 FLOAT NOT NULL DEFAULT 0,
  fecha_lectura TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- DLI por canales (IDs 16-19)
-- Los canales llegan en pares: se usa UPSERT en EspPost.php
CREATE TABLE IF NOT EXISTS iluminacion_dli_canales (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  ch0 FLOAT NOT NULL DEFAULT 0,
  ch1 FLOAT NOT NULL DEFAULT 0,
  ch2 FLOAT NOT NULL DEFAULT 0,
  ch3 FLOAT NOT NULL DEFAULT 0,
  ch4 FLOAT NOT NULL DEFAULT 0,
  ch5 FLOAT NOT NULL DEFAULT 0,
  ch6 FLOAT NOT NULL DEFAULT 0,
  ch7 FLOAT NOT NULL DEFAULT 0,
  fecha_lectura TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- PROYECTO 4: SISTEMA DE RIEGO
-- ============================================================
CREATE TABLE IF NOT EXISTS riego_temp_suelo (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  temperatura_suelo FLOAT NOT NULL,
  fecha_lectura TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS riego_temp_ambiente (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  temperatura_ambiente FLOAT NOT NULL,
  fecha_lectura TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS riego_hum_ambiente (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  humedad_ambiente FLOAT NOT NULL,
  fecha_lectura TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS riego_hum_suelo (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  humedad_suelo FLOAT NOT NULL,
  fecha_lectura TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS riego_potasio (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  potasio FLOAT NOT NULL,
  fecha_lectura TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS riego_fosforo (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  fosforo FLOAT NOT NULL,
  fecha_lectura TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS riego_nitrogeno (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  nitrogeno FLOAT NOT NULL,
  fecha_lectura TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- DATOS DE PRUEBA PARA ILUMINACION
-- ============================================================

-- Datos de prueba para PPFD
INSERT INTO iluminacion_ppfd (ppfd, foco_estado, fecha_lectura) VALUES
(325.4, 1, DATE_SUB(NOW(), INTERVAL 5 SECOND)),
(318.2, 1, DATE_SUB(NOW(), INTERVAL 35 SECOND)),
(310.7, 1, DATE_SUB(NOW(), INTERVAL 65 SECOND)),
(298.1, 1, DATE_SUB(NOW(), INTERVAL 95 SECOND)),
(305.5, 1, DATE_SUB(NOW(), INTERVAL 125 SECOND));

-- Datos de prueba para DLI
INSERT INTO iluminacion_dli (dli_total, dli_bruto_total, fecha_lectura) VALUES
(12.45, 13.20, DATE_SUB(NOW(), INTERVAL 5 SECOND)),
(12.38, 13.10, DATE_SUB(NOW(), INTERVAL 35 SECOND)),
(12.30, 13.00, DATE_SUB(NOW(), INTERVAL 65 SECOND)),
(12.15, 12.85, DATE_SUB(NOW(), INTERVAL 95 SECOND)),
(12.05, 12.70, DATE_SUB(NOW(), INTERVAL 125 SECOND));

-- Datos de prueba para espectro (canales PPFD)
INSERT INTO iluminacion_espectro (ch0, ch1, ch2, ch3, ch4, ch5, ch6, ch7, fecha_lectura) VALUES
(3200, 5800, 4200, 2100, 1800, 2400, 8500, 7200, DATE_SUB(NOW(), INTERVAL 5 SECOND)),
(3150, 5700, 4100, 2050, 1750, 2350, 8400, 7100, DATE_SUB(NOW(), INTERVAL 35 SECOND)),
(3100, 5600, 4000, 2000, 1700, 2300, 8300, 7000, DATE_SUB(NOW(), INTERVAL 65 SECOND)),
(3050, 5500, 3900, 1950, 1650, 2250, 8200, 6900, DATE_SUB(NOW(), INTERVAL 95 SECOND)),
(3000, 5400, 3800, 1900, 1600, 2200, 8100, 6800, DATE_SUB(NOW(), INTERVAL 125 SECOND));

-- Datos de prueba para DLI por canales
INSERT INTO iluminacion_dli_canales (ch0, ch1, ch2, ch3, ch4, ch5, ch6, ch7, fecha_lectura) VALUES
(0.52, 1.69, 1.82, 1.17, 1.04, 1.30, 3.12, 2.34, DATE_SUB(NOW(), INTERVAL 5 SECOND)),
(0.51, 1.67, 1.80, 1.15, 1.02, 1.28, 3.08, 2.31, DATE_SUB(NOW(), INTERVAL 35 SECOND)),
(0.50, 1.65, 1.78, 1.13, 1.00, 1.26, 3.04, 2.28, DATE_SUB(NOW(), INTERVAL 65 SECOND)),
(0.49, 1.63, 1.76, 1.11, 0.98, 1.24, 3.00, 2.25, DATE_SUB(NOW(), INTERVAL 95 SECOND)),
(0.48, 1.61, 1.74, 1.09, 0.96, 1.22, 2.96, 2.22, DATE_SUB(NOW(), INTERVAL 125 SECOND));
