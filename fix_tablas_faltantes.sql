-- ============================================================
-- FIX: Crear tablas faltantes que el backend necesita
-- ============================================================
-- Ejecuta esto en phpMyAdmin (pestaña SQL) para crear las
-- tablas que faltan y hacer que la pagina funcione.

USE greenhouse;

-- ============================================================
-- 1. Tabla users (requerida por el backend, aunque no uses login)
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================
-- 2. Tabla iluminacion_dli_canales (faltante!)
-- ============================================================
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

-- Indice para busquedas rapidas
CREATE INDEX idx_dlicanales_fecha ON iluminacion_dli_canales(fecha_lectura DESC);

-- ============================================================
-- 3. Datos de prueba para iluminacion_dli_canales
-- ============================================================
INSERT INTO iluminacion_dli_canales (ch0, ch1, ch2, ch3, ch4, ch5, ch6, ch7, fecha_lectura) VALUES
(0.52, 1.69, 1.82, 1.17, 1.04, 1.30, 3.12, 2.34, DATE_SUB(NOW(), INTERVAL 5 SECOND)),
(0.51, 1.67, 1.80, 1.15, 1.02, 1.28, 3.08, 2.31, DATE_SUB(NOW(), INTERVAL 35 SECOND)),
(0.50, 1.65, 1.78, 1.13, 1.00, 1.26, 3.04, 2.28, DATE_SUB(NOW(), INTERVAL 65 SECOND)),
(0.49, 1.63, 1.76, 1.11, 0.98, 1.24, 3.00, 2.25, DATE_SUB(NOW(), INTERVAL 95 SECOND)),
(0.48, 1.61, 1.74, 1.09, 0.96, 1.22, 2.96, 2.22, DATE_SUB(NOW(), INTERVAL 125 SECOND)),
(0.47, 1.59, 1.72, 1.07, 0.94, 1.20, 2.92, 2.19, DATE_SUB(NOW(), INTERVAL 155 SECOND)),
(0.46, 1.57, 1.70, 1.05, 0.92, 1.18, 2.88, 2.16, DATE_SUB(NOW(), INTERVAL 185 SECOND)),
(0.45, 1.55, 1.68, 1.03, 0.90, 1.16, 2.84, 2.13, DATE_SUB(NOW(), INTERVAL 215 SECOND)),
(0.44, 1.53, 1.66, 1.01, 0.88, 1.14, 2.80, 2.10, DATE_SUB(NOW(), INTERVAL 245 SECOND)),
(0.43, 1.51, 1.64, 0.99, 0.86, 1.12, 2.76, 2.07, DATE_SUB(NOW(), INTERVAL 275 SECOND));
