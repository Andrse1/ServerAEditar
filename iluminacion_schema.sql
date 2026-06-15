-- ============================================================
-- PROYECTO ILUMINACION (PhytoSense) - Tablas para EspPost.php
-- ============================================================
-- Estas tablas coinciden EXACTAMENTE con las operaciones del
-- datalogger en EspPost.php. Cada ID del 10 al 19 tiene su
-- tabla destino bien definida.
--
-- Formato del datalogger:
--   ID 10: ppfd_total + foco_estado       -> iluminacion_ppfd
--   ID 11: dli_total  + dli_excedente     -> iluminacion_dli
--   ID 12: ppfd_ch0  + ppfd_ch1           -> iluminacion_espectro  (UPSERT)
--   ID 13: ppfd_ch2  + ppfd_ch3           -> iluminacion_espectro  (UPSERT)
--   ID 14: ppfd_ch4  + ppfd_ch5           -> iluminacion_espectro  (UPSERT)
--   ID 15: ppfd_ch6  + ppfd_ch7           -> iluminacion_espectro  (UPSERT)
--   ID 16: dli_ch0   + dli_ch1            -> iluminacion_dli_canales (UPSERT)
--   ID 17: dli_ch2   + dli_ch3            -> iluminacion_dli_canales (UPSERT)
--   ID 18: dli_ch4   + dli_ch5            -> iluminacion_dli_canales (UPSERT)
--   ID 19: dli_ch6   + dli_ch7            -> iluminacion_dli_canales (UPSERT)
--
-- UPSERT = si llega dentro de 60 segundos de una fila existente,
--          actualiza esa fila. Si no, crea una nueva.
-- ============================================================

USE greenhouse;

-- ──────────────────────────────────────────────────────────────
-- 1. PPFD Total (ID 10 del datalogger)
--    Campos POST: ppfd_total, foco_estado
--    PHP: insertSimple("iluminacion_ppfd", [ppfd, foco_estado, fecha_lectura])
-- ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS iluminacion_ppfd (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  ppfd FLOAT NOT NULL,
  foco_estado FLOAT NOT NULL DEFAULT 0,
  fecha_lectura TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Indice para consultas rapidas por fecha (ultimos datos)
CREATE INDEX idx_ppfd_fecha ON iluminacion_ppfd(fecha_lectura DESC);

-- ──────────────────────────────────────────────────────────────
-- 2. DLI Total (ID 11 del datalogger)
--    Campos POST: dli_total, dli_excedente (este es el bruto)
--    PHP: insertSimple("iluminacion_dli", [dli_total, dli_bruto_total, fecha_lectura])
--
-- NOTA: El datalogger envia "dli_excedente" pero en realidad
--       es el dli_bruto_total (dli_total sin cappear).
--       El PHP lo guarda en la columna dli_bruto_total.
-- ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS iluminacion_dli (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  dli_total FLOAT NOT NULL,
  dli_bruto_total FLOAT NOT NULL DEFAULT 0,
  fecha_lectura TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE INDEX idx_dli_fecha ON iluminacion_dli(fecha_lectura DESC);

-- ──────────────────────────────────────────────────────────────
-- 3. Espectro PPFD por canales (IDs 12-15 del datalogger)
--    Campos POST: ppfd_ch0..ppfd_ch7 (llegan en pares)
--    PHP: upsertCanales("iluminacion_espectro", [ch0..ch7], fecha_lectura)
--
--    Los 4 paquetes (IDs 12,13,14,15) se unen en una sola fila
--    mediante el mecanismo UPSERT (60 segundos de ventana).
-- ──────────────────────────────────────────────────────────────
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Indice CRITICO para el UPSERT:
-- El PHP busca: fecha_lectura >= DATE_SUB(?, INTERVAL 60 SECOND)
CREATE INDEX idx_espectro_fecha ON iluminacion_espectro(fecha_lectura DESC);

-- ──────────────────────────────────────────────────────────────
-- 4. DLI por canales (IDs 16-19 del datalogger)
--    Campos POST: dli_ch0..dli_ch7 (llegan en pares)
--    PHP: upsertCanales("iluminacion_dli_canales", [ch0..ch7], fecha_lectura)
--
--    Los 4 paquetes (IDs 16,17,18,19) se unen en una sola fila
--    mediante el mecanismo UPSERT (60 segundos de ventana).
-- ──────────────────────────────────────────────────────────────
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Indice CRITICO para el UPSERT
CREATE INDEX idx_dlicanales_fecha ON iluminacion_dli_canales(fecha_lectura DESC);

-- ============================================================
-- DATOS DE PRUEBA (opcional: ejecutar para verificar)
-- ============================================================

-- PPFD de prueba
INSERT INTO iluminacion_ppfd (ppfd, foco_estado, fecha_lectura) VALUES
(325.4, 1, DATE_SUB(NOW(), INTERVAL 5 SECOND)),
(318.2, 1, DATE_SUB(NOW(), INTERVAL 35 SECOND)),
(310.7, 1, DATE_SUB(NOW(), INTERVAL 65 SECOND)),
(298.1, 1, DATE_SUB(NOW(), INTERVAL 95 SECOND)),
(305.5, 1, DATE_SUB(NOW(), INTERVAL 125 SECOND));

-- DLI de prueba
INSERT INTO iluminacion_dli (dli_total, dli_bruto_total, fecha_lectura) VALUES
(12.45, 13.20, DATE_SUB(NOW(), INTERVAL 5 SECOND)),
(12.38, 13.10, DATE_SUB(NOW(), INTERVAL 35 SECOND)),
(12.30, 13.00, DATE_SUB(NOW(), INTERVAL 65 SECOND)),
(12.15, 12.85, DATE_SUB(NOW(), INTERVAL 95 SECOND)),
(12.05, 12.70, DATE_SUB(NOW(), INTERVAL 125 SECOND));

-- Espectro de prueba (todos los canales completos)
INSERT INTO iluminacion_espectro (ch0, ch1, ch2, ch3, ch4, ch5, ch6, ch7, fecha_lectura) VALUES
(3200, 5800, 4200, 2100, 1800, 2400, 8500, 7200, DATE_SUB(NOW(), INTERVAL 5 SECOND)),
(3150, 5700, 4100, 2050, 1750, 2350, 8400, 7100, DATE_SUB(NOW(), INTERVAL 35 SECOND)),
(3100, 5600, 4000, 2000, 1700, 2300, 8300, 7000, DATE_SUB(NOW(), INTERVAL 65 SECOND)),
(3050, 5500, 3900, 1950, 1650, 2250, 8200, 6900, DATE_SUB(NOW(), INTERVAL 95 SECOND)),
(3000, 5400, 3800, 1900, 1600, 2200, 8100, 6800, DATE_SUB(NOW(), INTERVAL 125 SECOND));

-- DLI por canales de prueba
INSERT INTO iluminacion_dli_canales (ch0, ch1, ch2, ch3, ch4, ch5, ch6, ch7, fecha_lectura) VALUES
(0.52, 1.69, 1.82, 1.17, 1.04, 1.30, 3.12, 2.34, DATE_SUB(NOW(), INTERVAL 5 SECOND)),
(0.51, 1.67, 1.80, 1.15, 1.02, 1.28, 3.08, 2.31, DATE_SUB(NOW(), INTERVAL 35 SECOND)),
(0.50, 1.65, 1.78, 1.13, 1.00, 1.26, 3.04, 2.28, DATE_SUB(NOW(), INTERVAL 65 SECOND)),
(0.49, 1.63, 1.76, 1.11, 0.98, 1.24, 3.00, 2.25, DATE_SUB(NOW(), INTERVAL 95 SECOND)),
(0.48, 1.61, 1.74, 1.09, 0.96, 1.22, 2.96, 2.22, DATE_SUB(NOW(), INTERVAL 125 SECOND));
