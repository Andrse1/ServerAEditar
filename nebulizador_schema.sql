-- ============================================================
-- PROYECTO NEBULIZADOR - Tablas para EspPost.php
-- ============================================================
-- Formato del datalogger (legacy id_grupo + valor1):
--   ID 30 = humedad      -> nebulizador_humedad
--   ID 31 = temperatura  -> nebulizador_temperatura
--
-- Ademas se agrega la tabla de control manual de los aspersores,
-- que la pagina web escribe y el nodo ESP consulta (ver
-- nebulizador-control.php) para decidir su modo de operacion.
-- ============================================================

USE greenhouse;

-- ──────────────────────────────────────────────────────────────
-- 1. Humedad (ID 30 del datalogger)
-- ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS nebulizador_humedad (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  humedad FLOAT NOT NULL,
  fecha_lectura TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE INDEX idx_neb_humedad_fecha ON nebulizador_humedad(fecha_lectura DESC);

-- ──────────────────────────────────────────────────────────────
-- 2. Temperatura (ID 31 del datalogger)
-- ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS nebulizador_temperatura (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  temperatura FLOAT NOT NULL,
  fecha_lectura TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE INDEX idx_neb_temp_fecha ON nebulizador_temperatura(fecha_lectura DESC);

-- ──────────────────────────────────────────────────────────────
-- 3. Control manual de aspersores (append-only)
--    modo:       'auto'   -> el nodo decide segun la humedad
--                'manual' -> el nodo respeta el campo aspersores
--    aspersores: 0 = apagados, 1 = encendidos (solo en modo manual)
--    El nodo lee la fila mas reciente por fecha_actualizacion.
-- ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS nebulizador_control (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  modo ENUM('auto', 'manual') NOT NULL DEFAULT 'auto',
  aspersores TINYINT NOT NULL DEFAULT 0,
  fecha_actualizacion TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE INDEX idx_neb_control_fecha ON nebulizador_control(fecha_actualizacion DESC);

-- ============================================================
-- DATOS DE PRUEBA (opcional)
-- ============================================================

INSERT INTO nebulizador_humedad (humedad, fecha_lectura) VALUES
(82, DATE_SUB(NOW(), INTERVAL 5 SECOND)),
(80, DATE_SUB(NOW(), INTERVAL 35 SECOND)),
(78, DATE_SUB(NOW(), INTERVAL 65 SECOND)),
(77, DATE_SUB(NOW(), INTERVAL 95 SECOND)),
(79, DATE_SUB(NOW(), INTERVAL 125 SECOND));

INSERT INTO nebulizador_temperatura (temperatura, fecha_lectura) VALUES
(24.7, DATE_SUB(NOW(), INTERVAL 5 SECOND)),
(24.3, DATE_SUB(NOW(), INTERVAL 35 SECOND)),
(24.0, DATE_SUB(NOW(), INTERVAL 65 SECOND)),
(23.9, DATE_SUB(NOW(), INTERVAL 95 SECOND)),
(24.2, DATE_SUB(NOW(), INTERVAL 125 SECOND));

-- Estado de control inicial: automatico, aspersores apagados
INSERT INTO nebulizador_control (modo, aspersores) VALUES ('auto', 0);
