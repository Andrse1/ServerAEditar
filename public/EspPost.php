<?php
/**
 * Greenhouse Server - Endpoint para recibir datos del Datalogger ESP32
 *
 * Acomoda los siguientes proyectos y sus IDs:
 *
 * ═══════════════════════════════════════════════════════════════
 * ILUMINACION (PhytoSense) — IDs 10-19
 * ═══════════════════════════════════════════════════════════════
 *   ID 10: ppfd_total + foco_estado       -> iluminacion_ppfd
 *   ID 11: dli_total + dli_excedente      -> iluminacion_dli
 *   ID 12: ppfd_ch0 + ppfd_ch1            -> iluminacion_espectro (UPSERT)
 *   ID 13: ppfd_ch2 + ppfd_ch3            -> iluminacion_espectro (UPSERT)
 *   ID 14: ppfd_ch4 + ppfd_ch5            -> iluminacion_espectro (UPSERT)
 *   ID 15: ppfd_ch6 + ppfd_ch7            -> iluminacion_espectro (UPSERT)
 *   ID 16: dli_ch0  + dli_ch1             -> iluminacion_dli_canales (UPSERT)
 *   ID 17: dli_ch2  + dli_ch3             -> iluminacion_dli_canales (UPSERT)
 *   ID 18: dli_ch4  + dli_ch5             -> iluminacion_dli_canales (UPSERT)
 *   ID 19: dli_ch6  + dli_ch7             -> iluminacion_dli_canales (UPSERT)
 *
 * ═══════════════════════════════════════════════════════════════
 * CO2 / SENSOR DE GASES — IDs 20-23 (2 ZONAS)
 * ═══════════════════════════════════════════════════════════════
 *   ID 20: gas1_temperatura + gas1_humedad -> co2_zona1_temperatura / co2_zona1_humedad
 *   ID 21: gas1_co2                        -> co2_zona1_concentracion
 *   ID 22: gas2_temperatura + gas2_humedad -> co2_zona2_temperatura / co2_zona2_humedad
 *   ID 23: gas2_co2                        -> co2_zona2_concentracion
 *
 * ═══════════════════════════════════════════════════════════════
 * SISTEMA DE RIEGO — IDs 40-46 (legacy, via id_grupo+valor1)
 * ═══════════════════════════════════════════════════════════════
 *   ID 40 = temperatura_suelo     ID 41 = temperatura_ambiente
 *   ID 42 = humedad_ambiente      ID 43 = humedad_suelo
 *   ID 44 = potasio               ID 45 = fosforo
 *   ID 46 = nitrogeno
 *
 * ═══════════════════════════════════════════════════════════════
 * NEBULIZADOR — ID 30 (legacy, via id_grupo+valor1)
 * ═══════════════════════════════════════════════════════════════
 *   ID 30 = humedad
 */

header("Content-Type: application/json");
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// ── CONFIGURACION ──
$servername = "localhost";
$username   = "root";
$password   = "";
$dbname     = "greenhouse";
$port       = 3306;

$conn = new mysqli($servername, $username, $password, $dbname, $port);
if ($conn->connect_error) {
    http_response_code(500);
    echo json_encode(["error" => "Conexion fallida: " . $conn->connect_error]);
    exit;
}
$conn->set_charset("utf8mb4");

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(["error" => "Solo se acepta POST"]);
    $conn->close();
    exit;
}

// Leer parametros del POST
$postData = $_POST;
if (empty($postData)) {
    $input = file_get_contents('php://input');
    parse_str($input, $postData);
}

// Construir timestamp
$fecha = isset($postData['fecha_lectura']) ? $postData['fecha_lectura'] : date('Y-m-d');
$hora  = isset($postData['hora_lectura'])  ? $postData['hora_lectura']  : date('H:i:s');
$timestamp = $fecha . ' ' . $hora;

// ── Funcion: UPSERT de canales (para IDs que llegan en pares) ──
function upsertCanales($conn, $tabla, $timestamp, $canales) {
    $stmt = $conn->prepare("SELECT id FROM `$tabla` WHERE fecha_lectura >= DATE_SUB(?, INTERVAL 60 SECOND) ORDER BY fecha_lectura DESC LIMIT 1");
    $stmt->bind_param("s", $timestamp);
    $stmt->execute();
    $res = $stmt->get_result();
    $fila = $res->fetch_assoc();
    $stmt->close();

    if ($fila) {
        $setParts = []; $types = ""; $vals = [];
        foreach ($canales as $col => $val) {
            $setParts[] = "`$col` = ?"; $types .= "d"; $vals[] = $val;
        }
        $sql = "UPDATE `$tabla` SET " . implode(", ", $setParts) . " WHERE id = ?";
        $types .= "i"; $vals[] = $fila['id'];
        $stmt = $conn->prepare($sql);
        $stmt->bind_param($types, ...$vals);
        $stmt->execute();
        $stmt->close();
        return ["action" => "UPDATE", "id" => $fila['id']];
    } else {
        $cols = ["fecha_lectura"]; $vals = [$timestamp]; $types = "s"; $ph = ["?"];
        foreach ($canales as $col => $val) {
            $cols[] = $col; $vals[] = $val; $types .= "d"; $ph[] = "?";
        }
        $sql = "INSERT INTO `$tabla` (`" . implode("`, `", $cols) . "`) VALUES (" . implode(", ", $ph) . ")";
        $stmt = $conn->prepare($sql);
        $stmt->bind_param($types, ...$vals);
        $stmt->execute();
        $insertId = $stmt->insert_id;
        $stmt->close();
        return ["action" => "INSERT", "id" => $insertId];
    }
}

// ── Funcion: INSERT simple ──
function insertSimple($conn, $tabla, $columnas) {
    $cols = array_keys($columnas); $vals = array_values($columnas);
    $types = "";
    foreach ($vals as $v) {
        if (is_int($v)) $types .= "i";
        elseif (is_float($v) || is_double($v)) $types .= "d";
        else $types .= "s";
    }
    $sql = "INSERT INTO `$tabla` (`" . implode("`, `", $cols) . "`) VALUES (" . implode(", ", array_fill(0, count($cols), "?")) . ")";
    $stmt = $conn->prepare($sql);
    $stmt->bind_param($types, ...$vals);
    $stmt->execute();
    $insertId = $stmt->insert_id;
    $stmt->close();
    return ["action" => "INSERT", "id" => $insertId];
}

// ═══════════════════════════════════════════════════════════════
// ROUTING PRINCIPAL: Detectar tipo de dato segun campos presentes
// ═══════════════════════════════════════════════════════════════

$result = null;
$tabla = "";

// ── ID 10: PPFD Total + Foco estado ──
if (isset($postData['ppfd_total']) && isset($postData['foco_estado'])) {
    $result = insertSimple($conn, "iluminacion_ppfd", [
        "ppfd" => floatval($postData['ppfd_total']),
        "foco_estado" => floatval($postData['foco_estado']),
        "fecha_lectura" => $timestamp
    ]);
    $tabla = "iluminacion_ppfd";
}

// ── ID 11: DLI Total + DLI Excedente (bruto) ──
elseif (isset($postData['dli_total']) && isset($postData['dli_excedente'])) {
    $result = insertSimple($conn, "iluminacion_dli", [
        "dli_total" => floatval($postData['dli_total']),
        "dli_bruto_total" => floatval($postData['dli_excedente']),
        "fecha_lectura" => $timestamp
    ]);
    $tabla = "iluminacion_dli";
}

// ── IDs 12-15: PPFD por canales ──
elseif (isset($postData['ppfd_ch0']) && isset($postData['ppfd_ch1'])) {
    $result = upsertCanales($conn, "iluminacion_espectro", $timestamp, [
        "ch0" => floatval($postData['ppfd_ch0']), "ch1" => floatval($postData['ppfd_ch1'])
    ]); $tabla = "iluminacion_espectro";
}
elseif (isset($postData['ppfd_ch2']) && isset($postData['ppfd_ch3'])) {
    $result = upsertCanales($conn, "iluminacion_espectro", $timestamp, [
        "ch2" => floatval($postData['ppfd_ch2']), "ch3" => floatval($postData['ppfd_ch3'])
    ]); $tabla = "iluminacion_espectro";
}
elseif (isset($postData['ppfd_ch4']) && isset($postData['ppfd_ch5'])) {
    $result = upsertCanales($conn, "iluminacion_espectro", $timestamp, [
        "ch4" => floatval($postData['ppfd_ch4']), "ch5" => floatval($postData['ppfd_ch5'])
    ]); $tabla = "iluminacion_espectro";
}
elseif (isset($postData['ppfd_ch6']) && isset($postData['ppfd_ch7'])) {
    $result = upsertCanales($conn, "iluminacion_espectro", $timestamp, [
        "ch6" => floatval($postData['ppfd_ch6']), "ch7" => floatval($postData['ppfd_ch7'])
    ]); $tabla = "iluminacion_espectro";
}

// ── IDs 16-19: DLI por canales ──
elseif (isset($postData['dli_ch0']) && isset($postData['dli_ch1'])) {
    $result = upsertCanales($conn, "iluminacion_dli_canales", $timestamp, [
        "ch0" => floatval($postData['dli_ch0']), "ch1" => floatval($postData['dli_ch1'])
    ]); $tabla = "iluminacion_dli_canales";
}
elseif (isset($postData['dli_ch2']) && isset($postData['dli_ch3'])) {
    $result = upsertCanales($conn, "iluminacion_dli_canales", $timestamp, [
        "ch2" => floatval($postData['dli_ch2']), "ch3" => floatval($postData['dli_ch3'])
    ]); $tabla = "iluminacion_dli_canales";
}
elseif (isset($postData['dli_ch4']) && isset($postData['dli_ch5'])) {
    $result = upsertCanales($conn, "iluminacion_dli_canales", $timestamp, [
        "ch4" => floatval($postData['dli_ch4']), "ch5" => floatval($postData['dli_ch5'])
    ]); $tabla = "iluminacion_dli_canales";
}
elseif (isset($postData['dli_ch6']) && isset($postData['dli_ch7'])) {
    $result = upsertCanales($conn, "iluminacion_dli_canales", $timestamp, [
        "ch6" => floatval($postData['dli_ch6']), "ch7" => floatval($postData['dli_ch7'])
    ]); $tabla = "iluminacion_dli_canales";
}

// ── IDs 20-21: CO2 ZONA 1 ──
elseif (isset($postData['gas1_temperatura']) && isset($postData['gas1_humedad'])) {
    // Insertar temperatura
    insertSimple($conn, "co2_zona1_temperatura", [
        "temperatura" => floatval($postData['gas1_temperatura']),
        "fecha_lectura" => $timestamp
    ]);
    // Insertar humedad
    $result = insertSimple($conn, "co2_zona1_humedad", [
        "humedad" => floatval($postData['gas1_humedad']),
        "fecha_lectura" => $timestamp
    ]);
    $tabla = "co2_zona1_temperatura + co2_zona1_humedad";
}
elseif (isset($postData['gas1_co2'])) {
    $result = insertSimple($conn, "co2_zona1_concentracion", [
        "co2_ppm" => floatval($postData['gas1_co2']),
        "fecha_lectura" => $timestamp
    ]);
    $tabla = "co2_zona1_concentracion";
}

// ── IDs 22-23: CO2 ZONA 2 ──
elseif (isset($postData['gas2_temperatura']) && isset($postData['gas2_humedad'])) {
    insertSimple($conn, "co2_zona2_temperatura", [
        "temperatura" => floatval($postData['gas2_temperatura']),
        "fecha_lectura" => $timestamp
    ]);
    $result = insertSimple($conn, "co2_zona2_humedad", [
        "humedad" => floatval($postData['gas2_humedad']),
        "fecha_lectura" => $timestamp
    ]);
    $tabla = "co2_zona2_temperatura + co2_zona2_humedad";
}
elseif (isset($postData['gas2_co2'])) {
    $result = insertSimple($conn, "co2_zona2_concentracion", [
        "co2_ppm" => floatval($postData['gas2_co2']),
        "fecha_lectura" => $timestamp
    ]);
    $tabla = "co2_zona2_concentracion";
}

// ── Formato legacy: id_grupo + valor1 (riego, nebulizador) ──
elseif (isset($postData['id_grupo'])) {
    $id_grupo = intval($postData['id_grupo']);
    $valor1   = isset($postData['valor1']) ? floatval($postData['valor1']) : 0.0;

    $sensorMap = [
        // Nebulizador
        30 => ["tabla" => "nebulizador_humedad", "campo" => "humedad"],
        // Riego
        40 => ["tabla" => "riego_temp_suelo",    "campo" => "temperatura_suelo"],
        41 => ["tabla" => "riego_temp_ambiente", "campo" => "temperatura_ambiente"],
        42 => ["tabla" => "riego_hum_ambiente",  "campo" => "humedad_ambiente"],
        43 => ["tabla" => "riego_hum_suelo",     "campo" => "humedad_suelo"],
        44 => ["tabla" => "riego_potasio",       "campo" => "potasio"],
        45 => ["tabla" => "riego_fosforo",       "campo" => "fosforo"],
        46 => ["tabla" => "riego_nitrogeno",     "campo" => "nitrogeno"],
    ];

    if (!isset($sensorMap[$id_grupo])) {
        http_response_code(400);
        echo json_encode(["error" => "id_grupo no reconocido", "id_grupo" => $id_grupo]);
        $conn->close();
        exit;
    }

    $cfg = $sensorMap[$id_grupo];
    $tabla = $cfg["tabla"];
    $campo = $cfg["campo"];

    $stmt = $conn->prepare("INSERT INTO `$tabla` (`$campo`, `fecha_lectura`) VALUES (?, ?)");
    $stmt->bind_param("ds", $valor1, $timestamp);
    $stmt->execute();
    $result = ["action" => "INSERT", "id" => $stmt->insert_id];
    $stmt->close();
}

// ── Formato no reconocido ──
else {
    http_response_code(400);
    echo json_encode([
        "error" => "Formato no reconocido",
        "received" => array_slice($postData, 0, 10),
        "help" => "Se esperan campos como ppfd_total, gas1_temperatura, id_grupo, etc."
    ]);
    $conn->close();
    exit;
}

// Respuesta exitosa
http_response_code(200);
echo json_encode([
    "success" => true,
    "tabla" => $tabla,
    "action" => $result["action"] ?? "unknown",
    "id" => $result["id"] ?? null,
    "timestamp" => $timestamp,
]);

$conn->close();
?>
