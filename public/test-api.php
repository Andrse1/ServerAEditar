<?php
/**
 * DIAGNOSTICO RAPIDO: Donde se rompe la cadena de datos
 * Abre esto en el navegador: http://localhost/invernaderosi/public/test-api.php
 */
header("Content-Type: text/plain; charset=utf-8");

echo "=== DIAGNOSTICO CADENA DE DATOS ===\n\n";

// ------------------------------------------------------------------
// TEST 1: MySQL esta vivo?
// ------------------------------------------------------------------
echo "[1] MySQL... ";
$conn = new mysqli("localhost", "root", "", "greenhouse", 3306);
if ($conn->connect_error) {
    echo "FALLO: " . $conn->connect_error . "\n";
    echo "    -> Solucion: Inicia MySQL en XAMPP Control Panel\n";
    exit;
}
echo "OK\n";

// ------------------------------------------------------------------
// TEST 2: Tablas existen?
// ------------------------------------------------------------------
echo "[2] Tablas... ";
$tables = [
    "co2_zona1_temperatura", "co2_zona1_humedad", "co2_zona1_concentracion",
    "co2_zona2_temperatura", "co2_zona2_humedad", "co2_zona2_concentracion",
    "iluminacion_ppfd", "iluminacion_dli", "iluminacion_espectro",
    "iluminacion_dli_canales",
    "riego_temp_suelo", "riego_temp_ambiente", "riego_hum_ambiente",
    "riego_hum_suelo", "riego_potasio", "riego_fosforo", "riego_nitrogeno",
    "nebulizador_humedad", "users"
];
$missing = [];
foreach ($tables as $t) {
    $r = $conn->query("SHOW TABLES LIKE '$t'");
    if (!$r || $r->num_rows == 0) $missing[] = $t;
}
if (count($missing) > 0) {
    echo "FALTAN:\n";
    foreach ($missing as $m) echo "    - $m\n";
    echo "    -> Solucion: Ejecuta greenhouse_schema_completo.sql en phpMyAdmin\n";
} else {
    echo "OK (todas las " . count($tables) . " tablas presentes)\n";
}

// ------------------------------------------------------------------
// TEST 3: Hay datos?
// ------------------------------------------------------------------
echo "[3] Datos en tablas...\n";
$dataTables = [
    "co2_zona1_temperatura" => "temperatura",
    "iluminacion_ppfd" => "ppfd",
    "riego_hum_suelo" => "humedad_suelo",
];
foreach ($dataTables as $t => $campo) {
    $r = $conn->query("SELECT COUNT(*) as c FROM $t");
    $count = $r ? $r->fetch_assoc()['c'] : 0;
    echo "    $t: $count registros\n";
    if ($count == 0) {
        echo "    -> AVISO: Sin datos. Inserta datos de prueba o conecta el ESP32.\n";
    }
}

// ------------------------------------------------------------------
// TEST 4: El backend Node.js responde?
// ------------------------------------------------------------------
echo "[4] Backend Node.js... ";
$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, "http://localhost:3000/api/trpc/co2.zona1TemperaturaUltimo");
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_TIMEOUT, 5);
$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$curlErr = curl_error($ch);
curl_close($ch);

if ($curlErr) {
    echo "FALLO: No puedo conectar a localhost:3000\n";
    echo "    Error: $curlErr\n";
    echo "    -> Solucion 1: Asegurate de que 'npm run dev' esta corriendo\n";
    echo "    -> Solucion 2: Si usas otra IP, cambia localhost por tu IP\n";
    echo "\n=== RESUMEN: El problema es que el SERVIDOR NODE.JS NO ESTA CORRIENDO ===\n";
    echo "Abre una terminal, ve a la carpeta del proyecto y ejecuta: npm run dev\n";
    exit;
}

if ($httpCode == 200) {
    echo "OK (HTTP 200)\n";
    $json = json_decode($response, true);
    if (isset($json['result']) && isset($json['result']['data'])) {
        $data = $json['result']['data'];
        if (is_array($data) && count($data) > 0) {
            $temp = $data[0]['temperatura'] ?? 'N/A';
            echo "    -> Ultima temperatura zona 1: $temp °C\n";
            echo "\n=== TODO FUNCIONA: Backend, DB y datos OK ===\n";
            echo "Si la pagina sigue sin mostrar datos, recarga con Ctrl+F5\n";
        } else {
            echo "    -> Backend responde pero SIN DATOS (tabla vacia)\n";
            echo "    -> Solucion: Inserta datos de prueba en la tabla\n";
        }
    } else if (isset($json['error'])) {
        echo "    -> ERROR del backend: " . json_encode($json['error'], JSON_PRETTY_PRINT) . "\n";
        echo "\n=== El backend se conecta a MySQL pero falla la query ===\n";
        echo "Posibles causas:\n";
        echo "  - La tabla existe pero las columnas no coinciden con el schema\n";
        echo "  - La conexion MySQL se cerro (reinicia npm run dev)\n";
        echo "  - Las tablas fueron creadas manualmente y no con el SQL correcto\n";
    }
} else if ($httpCode == 500) {
    echo "ERROR 500\n";
    echo "    Respuesta: " . substr($response, 0, 500) . "\n";
    echo "\n=== El backend falla al consultar MySQL ===\n";
    echo "Posibles causas:\n";
    echo "  1. El schema de Drizzle no coincide con las tablas reales\n";
    echo "  2. Falta la tabla 'users' (requerida por el backend)\n";
    echo "  3. La conexion MySQL se cerro\n";
    echo "\nSoluciones:\n";
    echo "  a) Borra la base de datos y recreala con: greenhouse_schema_completo.sql\n";
    echo "  b) Reinicia el servidor: Ctrl+C, luego npm run dev\n";
} else {
    echo "HTTP $httpCode\n";
    echo "    Respuesta: " . substr($response, 0, 300) . "\n";
}

$conn->close();
?>
