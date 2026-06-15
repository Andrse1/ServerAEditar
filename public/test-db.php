<?php
/**
 * Script de diagnostico para verificar la conexion a la base de datos
 * y mostrar los datos de las tablas del sistema de riego.
 *
 * PASOS:
 * 1. Copiar este archivo a tu carpeta de XAMPP:
 *    C:\xampp\htdocs\invernaderosi\public\test-db.php
 * 2. Abrir en el navegador: http://172.16.2.31/invernaderosi/public/test-db.php
 */

header("Content-Type: text/html; charset=utf-8");

// ── CONFIGURACION ──
$servername = "localhost";
$username   = "root";
$password   = "";          // Cambia si tu root tiene contraseña
$dbname     = "greenhouse";
$port       = 3306;

echo "<html><head><style>
";
echo "body{font-family:monospace;padding:20px;background:#0f172a;color:#e2e8f0;}";
echo ".ok{color:#22c55e;font-weight:bold;}";
echo ".err{color:#ef4444;font-weight:bold;}";
echo ".warn{color:#f59e0b;font-weight:bold;}";
echo "table{border-collapse:collapse;margin:10px 0;width:100%;font-size:12px;}";
echo "th,td{border:1px solid #334155;padding:6px;text-align:left;}";
echo "th{background:#1e293b;color:#22c55e;}";
echo "tr:nth-child(even){background:#1e293b;}";
echo "h2{color:#22c55e;border-bottom:2px solid #22c55e;padding-bottom:5px;}";
echo "h3{color:#38bdf8;margin-top:20px;}";
echo ".box{background:#1e293b;border:1px solid #334155;border-radius:8px;padding:15px;margin:10px 0;}";
echo "</style></head><body>";

echo "<h1>🌱 Greenhouse Server - Diagnostico de Base de Datos</h1>";

// ═══════════════════════════════════════════════════════════════
// 1) CONEXION A MySQL
// ═══════════════════════════════════════════════════════════════
echo "<div class='box'>";
echo "<h2>1. Conexion a MySQL</h2>";

$conn = new mysqli($servername, $username, $password, "", $port);
if ($conn->connect_error) {
    echo "<p class='err'>❌ ERROR: No se pudo conectar a MySQL</p>";
    echo "<p>Error: " . $conn->connect_error . "</p>";
    echo "<p class='warn'>⚠️ Verifica que XAMPP/MySQL esté corriendo</p>";
    echo "</div></body></html>";
    exit;
}
echo "<p class='ok'>✅ Conexion a MySQL exitosa</p>";
echo "<p>Servidor: {$servername}:{$port} | Usuario: {$username}</p>";
$conn->close();
echo "</div>";

// ═══════════════════════════════════════════════════════════════
// 2) BASE DE DATOS EXISTE
// ═══════════════════════════════════════════════════════════════
echo "<div class='box'>";
echo "<h2>2. Base de datos '{$dbname}'</h2>";

$conn = new mysqli($servername, $username, $password, "", $port);
$res = $conn->query("SHOW DATABASES LIKE '{$dbname}'");
if ($res && $res->num_rows > 0) {
    echo "<p class='ok'>✅ Base de datos '{$dbname}' existe</p>";
} else {
    echo "<p class='err'>❌ La base de datos '{$dbname}' NO existe</p>";
    echo "<p class='warn'>⚠️ Ejecuta en phpMyAdmin: CREATE DATABASE greenhouse;</p>";
}
$conn->close();
echo "</div>";

// ═══════════════════════════════════════════════════════════════
// 3) CONECTAR A LA BASE DE DATOS
// ═══════════════════════════════════════════════════════════════
echo "<div class='box'>";
echo "<h2>3. Tablas del Sistema de Riego</h2>";

$conn = new mysqli($servername, $username, $password, $dbname, $port);
if ($conn->connect_error) {
    echo "<p class='err'>❌ ERROR al conectar a '{$dbname}': " . $conn->connect_error . "</p>";
    echo "</div></body></html>";
    exit;
}
$conn->set_charset("utf8mb4");
echo "<p class='ok'>✅ Conectado a '{$dbname}'</p>";

$tablesRiego = [
    "riego_temp_suelo"    => "temperatura_suelo",
    "riego_temp_ambiente" => "temperatura_ambiente",
    "riego_hum_ambiente"  => "humedad_ambiente",
    "riego_hum_suelo"     => "humedad_suelo",
    "riego_potasio"       => "potasio",
    "riego_fosforo"       => "fosforo",
    "riego_nitrogeno"     => "nitrogeno",
];

foreach ($tablesRiego as $tabla => $campo) {
    // Verificar si la tabla existe
    $res = $conn->query("SHOW TABLES LIKE '{$tabla}'");
    $existe = ($res && $res->num_rows > 0);

    echo "<h3>" . ($existe ? "✅" : "❌") . " {$tabla}</h3>";

    if (!$existe) {
        echo "<p class='err'>Tabla no existe. Ejecuta el SQL para crearla.</p>";
        continue;
    }

    // Contar registros
    $res = $conn->query("SELECT COUNT(*) as total FROM {$tabla}");
    $count = $res ? $res->fetch_assoc()['total'] : 0;

    if ($count == 0) {
        echo "<p class='warn'>⚠️ Tabla vacia (0 registros). Necesitas insertar datos de prueba o conectar el ESP32.</p>";
        continue;
    }

    echo "<p class='ok'>📊 {$count} registros</p>";

    // Mostrar ultimos 5 registros
    $res = $conn->query("SELECT * FROM {$tabla} ORDER BY fecha_lectura DESC LIMIT 5");
    if ($res && $res->num_rows > 0) {
        echo "<table>";
        echo "<tr><th>ID</th><th>{$campo}</th><th>Fecha/Hora</th></tr>";
        while ($row = $res->fetch_assoc()) {
            echo "<tr>";
            echo "<td>" . $row['id'] . "</td>";
            echo "<td><strong>" . $row[$campo] . "</strong></td>";
            echo "<td>" . $row['fecha_lectura'] . "</td>";
            echo "</tr>";
        }
        echo "</table>";
    }
}

// ═══════════════════════════════════════════════════════════════
// 4) TABLAS DE ILUMINACION
// ═══════════════════════════════════════════════════════════════
echo "<h2>4. Tablas de Iluminacion</h2>";

$tablesIlum = [
    "iluminacion_ppfd"         => "ppfd",
    "iluminacion_dli"          => "dli_total",
    "iluminacion_espectro"     => "8 canales",
    "iluminacion_dli_canales"  => "8 canales DLI",
];

foreach ($tablesIlum as $tabla => $desc) {
    $res = $conn->query("SHOW TABLES LIKE '{$tabla}'");
    $existe = ($res && $res->num_rows > 0);
    $count = 0;
    if ($existe) {
        $res = $conn->query("SELECT COUNT(*) as total FROM {$tabla}");
        $count = $res ? $res->fetch_assoc()['total'] : 0;
    }
    echo "<p>" . ($existe ? "✅" : "❌") . " {$tabla} ({$desc}) — " . ($count > 0 ? "<span class='ok'>{$count} registros</span>" : "<span class='warn'>0 registros</span>") . "</p>";
}

$conn->close();
echo "</div>";

// ═══════════════════════════════════════════════════════════════
// 5) RESUMEN
// ═══════════════════════════════════════════════════════════════
echo "<div class='box'>";
echo "<h2>5. Resumen / Solucion de problemas</h2>";
echo "<p><strong>Si ves tablas con 0 registros:</strong></p>";
echo "<ol>";
echo "<li>Ejecuta el SQL de creacion de tablas en phpMyAdmin</li>";
echo "<li>Inserta datos de prueba (hay un script SQL incluido)</li>";
echo "<li>O conecta el ESP32 del sistema de riego para que envie datos reales</li>";
echo "</ol>";
echo "<p><strong>Si ves tablas con registros pero la pagina no los muestra:</strong></p>";
echo "<ol>";
echo "<li>Verifica que el servidor Node.js este corriendo (npm run dev en la carpeta del proyecto)</li>";
echo "<li>La pagina se accede por el servidor Node (localhost:3000), no por Apache/XAMPP</li>";
echo "<li>Revisa la consola del navegador (F12) por errores de red</li>";
echo "</ol>";
echo "</div>";

echo "</body></html>";
?>
