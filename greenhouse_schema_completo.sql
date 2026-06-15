-- ============================================================
-- GREENHOUSE SERVER - Schema Completo + Seed Data
-- Fecha: 2026-06-12
--
-- Proyectos:
--   1. CO2 / Sensor de Gases (2 zonas)     - IDs 20-23
--   2. Nebulizador                         - ID 30
--   3. Iluminacion / PhytoSense            - IDs 10-19
--   4. Sistema de Riego                    - IDs 40-46
-- ============================================================

CREATE DATABASE IF NOT EXISTS greenhouse CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE greenhouse;

-- ============================================================================
-- 0. Usuarios (requerido por infraestructura backend)
-- ============================================================================
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
) ENGINE=InnoDB;

-- ============================================================================
-- 1. CO2 / SENSOR DE GASES — 2 ZONAS
-- Datalogger: ID 20-21 (Zona 1), ID 22-23 (Zona 2)
-- ============================================================================

-- Zona 1
CREATE TABLE IF NOT EXISTS co2_zona1_temperatura (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  temperatura FLOAT NOT NULL,
  fecha_lectura TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_z1t_fecha (fecha_lectura DESC)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS co2_zona1_humedad (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  humedad FLOAT NOT NULL,
  fecha_lectura TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_z1h_fecha (fecha_lectura DESC)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS co2_zona1_concentracion (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  co2_ppm FLOAT NOT NULL,
  fecha_lectura TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_z1c_fecha (fecha_lectura DESC)
) ENGINE=InnoDB;

-- Zona 2
CREATE TABLE IF NOT EXISTS co2_zona2_temperatura (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  temperatura FLOAT NOT NULL,
  fecha_lectura TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_z2t_fecha (fecha_lectura DESC)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS co2_zona2_humedad (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  humedad FLOAT NOT NULL,
  fecha_lectura TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_z2h_fecha (fecha_lectura DESC)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS co2_zona2_concentracion (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  co2_ppm FLOAT NOT NULL,
  fecha_lectura TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_z2c_fecha (fecha_lectura DESC)
) ENGINE=InnoDB;

-- ============================================================================
-- 2. NEBULIZADOR
-- Datalogger: ID 30
-- ============================================================================
CREATE TABLE IF NOT EXISTS nebulizador_humedad (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  humedad FLOAT NOT NULL,
  fecha_lectura TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_neb_fecha (fecha_lectura DESC)
) ENGINE=InnoDB;

-- ============================================================================
-- 3. ILUMINACION (PhytoSense)
-- Datalogger: ID 10 (PPFD), ID 11 (DLI), IDs 12-15 (Espectro), IDs 16-19 (DLI Canales)
-- ============================================================================

CREATE TABLE IF NOT EXISTS iluminacion_ppfd (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  ppfd FLOAT NOT NULL,
  foco_estado FLOAT NOT NULL DEFAULT 0,
  fecha_lectura TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_ppfd_fecha (fecha_lectura DESC)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS iluminacion_dli (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  dli_total FLOAT NOT NULL,
  dli_bruto_total FLOAT NOT NULL DEFAULT 0,
  fecha_lectura TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_dli_fecha (fecha_lectura DESC)
) ENGINE=InnoDB;

-- Espectro PPFD por canales (IDs 12-15, UPSERT de 4 pares -> 1 fila)
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
  fecha_lectura TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_esp_fecha (fecha_lectura DESC)
) ENGINE=InnoDB;

-- DLI por canales (IDs 16-19, UPSERT de 4 pares -> 1 fila)
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
  fecha_lectura TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_dlch_fecha (fecha_lectura DESC)
) ENGINE=InnoDB;

-- ============================================================================
-- 4. SISTEMA DE RIEGO
-- Datalogger: IDs 40-46
-- ============================================================================
CREATE TABLE IF NOT EXISTS riego_temp_suelo (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  temperatura_suelo FLOAT NOT NULL,
  fecha_lectura TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_rts_fecha (fecha_lectura DESC)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS riego_temp_ambiente (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  temperatura_ambiente FLOAT NOT NULL,
  fecha_lectura TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_rta_fecha (fecha_lectura DESC)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS riego_hum_ambiente (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  humedad_ambiente FLOAT NOT NULL,
  fecha_lectura TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_rha_fecha (fecha_lectura DESC)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS riego_hum_suelo (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  humedad_suelo FLOAT NOT NULL,
  fecha_lectura TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_rhs_fecha (fecha_lectura DESC)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS riego_potasio (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  potasio FLOAT NOT NULL,
  fecha_lectura TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_rk_fecha (fecha_lectura DESC)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS riego_fosforo (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  fosforo FLOAT NOT NULL,
  fecha_lectura TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_rp_fecha (fecha_lectura DESC)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS riego_nitrogeno (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  nitrogeno FLOAT NOT NULL,
  fecha_lectura TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_rn_fecha (fecha_lectura DESC)
) ENGINE=InnoDB;


-- ═══════════════════════════════════════════════════════════════════════════
-- SEED DATA (datos de prueba para verificar que la pagina funciona)
-- ═══════════════════════════════════════════════════════════════════════════

-- Zona 1 CO2
INSERT INTO co2_zona1_temperatura (temperatura, fecha_lectura) VALUES
(22.5, DATE_SUB(NOW(), INTERVAL 145 SECOND)), (23.1, DATE_SUB(NOW(), INTERVAL 130 SECOND)),
(22.8, DATE_SUB(NOW(), INTERVAL 115 SECOND)), (23.5, DATE_SUB(NOW(), INTERVAL 100 SECOND)),
(24.2, DATE_SUB(NOW(), INTERVAL 85 SECOND)), (24.8, DATE_SUB(NOW(), INTERVAL 70 SECOND)),
(24.0, DATE_SUB(NOW(), INTERVAL 55 SECOND)), (23.3, DATE_SUB(NOW(), INTERVAL 40 SECOND)),
(22.9, DATE_SUB(NOW(), INTERVAL 25 SECOND)), (23.2, DATE_SUB(NOW(), INTERVAL 10 SECOND));

INSERT INTO co2_zona1_humedad (humedad, fecha_lectura) VALUES
(65, DATE_SUB(NOW(), INTERVAL 145 SECOND)), (67, DATE_SUB(NOW(), INTERVAL 130 SECOND)),
(64, DATE_SUB(NOW(), INTERVAL 115 SECOND)), (68, DATE_SUB(NOW(), INTERVAL 100 SECOND)),
(70, DATE_SUB(NOW(), INTERVAL 85 SECOND)), (72, DATE_SUB(NOW(), INTERVAL 70 SECOND)),
(69, DATE_SUB(NOW(), INTERVAL 55 SECOND)), (66, DATE_SUB(NOW(), INTERVAL 40 SECOND)),
(63, DATE_SUB(NOW(), INTERVAL 25 SECOND)), (65, DATE_SUB(NOW(), INTERVAL 10 SECOND));

INSERT INTO co2_zona1_concentracion (co2_ppm, fecha_lectura) VALUES
(400, DATE_SUB(NOW(), INTERVAL 145 SECOND)), (420, DATE_SUB(NOW(), INTERVAL 130 SECOND)),
(410, DATE_SUB(NOW(), INTERVAL 115 SECOND)), (430, DATE_SUB(NOW(), INTERVAL 100 SECOND)),
(450, DATE_SUB(NOW(), INTERVAL 85 SECOND)), (470, DATE_SUB(NOW(), INTERVAL 70 SECOND)),
(460, DATE_SUB(NOW(), INTERVAL 55 SECOND)), (440, DATE_SUB(NOW(), INTERVAL 40 SECOND)),
(420, DATE_SUB(NOW(), INTERVAL 25 SECOND)), (410, DATE_SUB(NOW(), INTERVAL 10 SECOND));

-- Zona 2 CO2
INSERT INTO co2_zona2_temperatura (temperatura, fecha_lectura) VALUES
(21.5, DATE_SUB(NOW(), INTERVAL 145 SECOND)), (22.1, DATE_SUB(NOW(), INTERVAL 130 SECOND)),
(21.8, DATE_SUB(NOW(), INTERVAL 115 SECOND)), (22.5, DATE_SUB(NOW(), INTERVAL 100 SECOND)),
(23.2, DATE_SUB(NOW(), INTERVAL 85 SECOND)), (23.8, DATE_SUB(NOW(), INTERVAL 70 SECOND)),
(23.0, DATE_SUB(NOW(), INTERVAL 55 SECOND)), (22.3, DATE_SUB(NOW(), INTERVAL 40 SECOND)),
(21.9, DATE_SUB(NOW(), INTERVAL 25 SECOND)), (22.2, DATE_SUB(NOW(), INTERVAL 10 SECOND));

INSERT INTO co2_zona2_humedad (humedad, fecha_lectura) VALUES
(63, DATE_SUB(NOW(), INTERVAL 145 SECOND)), (65, DATE_SUB(NOW(), INTERVAL 130 SECOND)),
(62, DATE_SUB(NOW(), INTERVAL 115 SECOND)), (66, DATE_SUB(NOW(), INTERVAL 100 SECOND)),
(68, DATE_SUB(NOW(), INTERVAL 85 SECOND)), (70, DATE_SUB(NOW(), INTERVAL 70 SECOND)),
(67, DATE_SUB(NOW(), INTERVAL 55 SECOND)), (64, DATE_SUB(NOW(), INTERVAL 40 SECOND)),
(61, DATE_SUB(NOW(), INTERVAL 25 SECOND)), (63, DATE_SUB(NOW(), INTERVAL 10 SECOND));

INSERT INTO co2_zona2_concentracion (co2_ppm, fecha_lectura) VALUES
(380, DATE_SUB(NOW(), INTERVAL 145 SECOND)), (400, DATE_SUB(NOW(), INTERVAL 130 SECOND)),
(390, DATE_SUB(NOW(), INTERVAL 115 SECOND)), (410, DATE_SUB(NOW(), INTERVAL 100 SECOND)),
(430, DATE_SUB(NOW(), INTERVAL 85 SECOND)), (450, DATE_SUB(NOW(), INTERVAL 70 SECOND)),
(440, DATE_SUB(NOW(), INTERVAL 55 SECOND)), (420, DATE_SUB(NOW(), INTERVAL 40 SECOND)),
(400, DATE_SUB(NOW(), INTERVAL 25 SECOND)), (390, DATE_SUB(NOW(), INTERVAL 10 SECOND));

-- Nebulizador
INSERT INTO nebulizador_humedad (humedad, fecha_lectura) VALUES
(78, DATE_SUB(NOW(), INTERVAL 50 SECOND)), (80, DATE_SUB(NOW(), INTERVAL 40 SECOND)),
(82, DATE_SUB(NOW(), INTERVAL 30 SECOND)), (85, DATE_SUB(NOW(), INTERVAL 20 SECOND)),
(83, DATE_SUB(NOW(), INTERVAL 10 SECOND));

-- Iluminacion PPFD
INSERT INTO iluminacion_ppfd (ppfd, foco_estado, fecha_lectura) VALUES
(325.4, 1, DATE_SUB(NOW(), INTERVAL 50 SECOND)), (318.2, 1, DATE_SUB(NOW(), INTERVAL 40 SECOND)),
(310.7, 1, DATE_SUB(NOW(), INTERVAL 30 SECOND)), (298.1, 1, DATE_SUB(NOW(), INTERVAL 20 SECOND)),
(305.5, 1, DATE_SUB(NOW(), INTERVAL 10 SECOND));

-- Iluminacion DLI
INSERT INTO iluminacion_dli (dli_total, dli_bruto_total, fecha_lectura) VALUES
(12.45, 13.20, DATE_SUB(NOW(), INTERVAL 50 SECOND)), (12.38, 13.10, DATE_SUB(NOW(), INTERVAL 40 SECOND)),
(12.30, 13.00, DATE_SUB(NOW(), INTERVAL 30 SECOND)), (12.15, 12.85, DATE_SUB(NOW(), INTERVAL 20 SECOND)),
(12.05, 12.70, DATE_SUB(NOW(), INTERVAL 10 SECOND));

-- Iluminacion Espectro
INSERT INTO iluminacion_espectro (ch0, ch1, ch2, ch3, ch4, ch5, ch6, ch7, fecha_lectura) VALUES
(3200, 5800, 4200, 2100, 1800, 2400, 8500, 7200, DATE_SUB(NOW(), INTERVAL 50 SECOND)),
(3150, 5700, 4100, 2050, 1750, 2350, 8400, 7100, DATE_SUB(NOW(), INTERVAL 40 SECOND)),
(3100, 5600, 4000, 2000, 1700, 2300, 8300, 7000, DATE_SUB(NOW(), INTERVAL 30 SECOND)),
(3050, 5500, 3900, 1950, 1650, 2250, 8200, 6900, DATE_SUB(NOW(), INTERVAL 20 SECOND)),
(3000, 5400, 3800, 1900, 1600, 2200, 8100, 6800, DATE_SUB(NOW(), INTERVAL 10 SECOND));

-- Iluminacion DLI Canales
INSERT INTO iluminacion_dli_canales (ch0, ch1, ch2, ch3, ch4, ch5, ch6, ch7, fecha_lectura) VALUES
(0.52, 1.69, 1.82, 1.17, 1.04, 1.30, 3.12, 2.34, DATE_SUB(NOW(), INTERVAL 50 SECOND)),
(0.51, 1.67, 1.80, 1.15, 1.02, 1.28, 3.08, 2.31, DATE_SUB(NOW(), INTERVAL 40 SECOND)),
(0.50, 1.65, 1.78, 1.13, 1.00, 1.26, 3.04, 2.28, DATE_SUB(NOW(), INTERVAL 30 SECOND)),
(0.49, 1.63, 1.76, 1.11, 0.98, 1.24, 3.00, 2.25, DATE_SUB(NOW(), INTERVAL 20 SECOND)),
(0.48, 1.61, 1.74, 1.09, 0.96, 1.22, 2.96, 2.22, DATE_SUB(NOW(), INTERVAL 10 SECOND));

-- Sistema de Riego
INSERT INTO riego_temp_suelo (temperatura_suelo, fecha_lectura) VALUES
(18.5, DATE_SUB(NOW(), INTERVAL 50 SECOND)), (19.2, DATE_SUB(NOW(), INTERVAL 40 SECOND)),
(20.1, DATE_SUB(NOW(), INTERVAL 30 SECOND)), (21.3, DATE_SUB(NOW(), INTERVAL 20 SECOND)),
(22.0, DATE_SUB(NOW(), INTERVAL 10 SECOND));

INSERT INTO riego_temp_ambiente (temperatura_ambiente, fecha_lectura) VALUES
(23.5, DATE_SUB(NOW(), INTERVAL 50 SECOND)), (24.1, DATE_SUB(NOW(), INTERVAL 40 SECOND)),
(24.8, DATE_SUB(NOW(), INTERVAL 30 SECOND)), (25.5, DATE_SUB(NOW(), INTERVAL 20 SECOND)),
(26.2, DATE_SUB(NOW(), INTERVAL 10 SECOND));

INSERT INTO riego_hum_ambiente (humedad_ambiente, fecha_lectura) VALUES
(60, DATE_SUB(NOW(), INTERVAL 50 SECOND)), (62, DATE_SUB(NOW(), INTERVAL 40 SECOND)),
(65, DATE_SUB(NOW(), INTERVAL 30 SECOND)), (68, DATE_SUB(NOW(), INTERVAL 20 SECOND)),
(70, DATE_SUB(NOW(), INTERVAL 10 SECOND));

INSERT INTO riego_hum_suelo (humedad_suelo, fecha_lectura) VALUES
(45, DATE_SUB(NOW(), INTERVAL 50 SECOND)), (47, DATE_SUB(NOW(), INTERVAL 40 SECOND)),
(50, DATE_SUB(NOW(), INTERVAL 30 SECOND)), (52, DATE_SUB(NOW(), INTERVAL 20 SECOND)),
(55, DATE_SUB(NOW(), INTERVAL 10 SECOND));

INSERT INTO riego_potasio (potasio, fecha_lectura) VALUES
(120, DATE_SUB(NOW(), INTERVAL 50 SECOND)), (125, DATE_SUB(NOW(), INTERVAL 40 SECOND)),
(130, DATE_SUB(NOW(), INTERVAL 30 SECOND)), (128, DATE_SUB(NOW(), INTERVAL 20 SECOND)),
(135, DATE_SUB(NOW(), INTERVAL 10 SECOND));

INSERT INTO riego_fosforo (fosforo, fecha_lectura) VALUES
(15, DATE_SUB(NOW(), INTERVAL 50 SECOND)), (16, DATE_SUB(NOW(), INTERVAL 40 SECOND)),
(17, DATE_SUB(NOW(), INTERVAL 30 SECOND)), (16, DATE_SUB(NOW(), INTERVAL 20 SECOND)),
(18, DATE_SUB(NOW(), INTERVAL 10 SECOND));

INSERT INTO riego_nitrogeno (nitrogeno, fecha_lectura) VALUES
(80, DATE_SUB(NOW(), INTERVAL 50 SECOND)), (82, DATE_SUB(NOW(), INTERVAL 40 SECOND)),
(85, DATE_SUB(NOW(), INTERVAL 30 SECOND)), (83, DATE_SUB(NOW(), INTERVAL 20 SECOND)),
(88, DATE_SUB(NOW(), INTERVAL 10 SECOND));
