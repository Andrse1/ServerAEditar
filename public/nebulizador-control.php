<?php
/**
 * nebulizador-control.php
 * ---------------------------------------------------------------------------
 * Endpoint de SOLO LECTURA para que el nodo ESP del nebulizador consulte el
 * estado de control manual configurado desde la pagina web.
 *
 * La pagina web escribe el estado en la tabla `nebulizador_control`
 * (a traves de tRPC). Aqui simplemente se devuelve la fila mas reciente:
 *
 *   {
 *     "modo": "auto" | "manual",   // 'auto' = el nodo decide por humedad
 *     "aspersores": 0 | 1,         // 0 = apagados, 1 = encendidos (solo manual)
 *     "fecha_actualizacion": "YYYY-MM-DD HH:MM:SS"
 *   }
 *
 * Si todavia no hay ninguna fila se devuelve el valor por defecto
 * ("auto" / aspersores apagados).
 * ---------------------------------------------------------------------------
 */

header("Content-Type: application/json");
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
header("Cache-Control: no-store, no-cache, must-revalidate, max-age=0");

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

$sql = "SELECT modo, aspersores, fecha_actualizacion
        FROM nebulizador_control
        ORDER BY fecha_actualizacion DESC
        LIMIT 1";
$res = $conn->query($sql);

if ($res && $res->num_rows > 0) {
    $row = $res->fetch_assoc();
    echo json_encode([
        "modo"                => $row["modo"],
        "aspersores"          => intval($row["aspersores"]),
        "fecha_actualizacion" => $row["fecha_actualizacion"],
    ]);
} else {
    // Sin estado registrado todavia: valor por defecto seguro.
    echo json_encode([
        "modo"                => "auto",
        "aspersores"          => 0,
        "fecha_actualizacion" => null,
    ]);
}

$conn->close();
?>
