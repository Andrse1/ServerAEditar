// Script de diagnostico: prueba conexion directa Node.js -> MySQL
// Ejecutar con: node test-mysql.js

import mysql from "mysql2/promise";

const config = {
  host: "localhost",
  user: "root",
  password: "",
  port: 3306,
};

async function test() {
  console.log("🔍 Test de conexion Node.js -> MySQL\n");
  console.log("Config:", JSON.stringify({ ...config, password: config.password ? "***" : "(vacía)" }));
  console.log("");

  try {
    // 1. Conectar sin base de datos
    console.log("1. Conectando a MySQL...");
    const conn = await mysql.createConnection(config);
    console.log("   ✅ Conexion exitosa\n");

    // 2. Verificar si la base de datos existe
    console.log("2. Verificando base de datos 'greenhouse'...");
    const [dbs] = await conn.execute("SHOW DATABASES LIKE 'greenhouse'");
    if (dbs.length === 0) {
      console.log("   ❌ La base de datos 'greenhouse' NO existe");
      console.log("   💡 Solucion: Ve a phpMyAdmin y crea la base de datos 'greenhouse'\n");
      await conn.end();
      return;
    }
    console.log("   ✅ Base de datos 'greenhouse' existe\n");

    // 3. Cambiar a la base de datos
    await conn.query("USE greenhouse");

    // 4. Verificar tablas del sistema de riego
    console.log("3. Verificando tablas del Sistema de Riego...");
    const tables = [
      "riego_temp_suelo",
      "riego_temp_ambiente",
      "riego_hum_ambiente",
      "riego_hum_suelo",
      "riego_potasio",
      "riego_fosforo",
      "riego_nitrogeno",
    ];

    for (const t of tables) {
      try {
        const [rows] = await conn.execute(`SELECT COUNT(*) as count FROM \`${t}\``);
        console.log(`   ✅ ${t}: ${rows[0].count} registros`);
      } catch (e) {
        console.log(`   ❌ ${t}: NO EXISTE (${e.message})`);
      }
    }

    // 5. Verificar tablas de iluminacion
    console.log("\n4. Verificando tablas de Iluminacion...");
    const ilumTables = [
      "iluminacion_ppfd",
      "iluminacion_dli",
      "iluminacion_espectro",
      "iluminacion_dli_canales",
    ];
    for (const t of ilumTables) {
      try {
        const [rows] = await conn.execute(`SELECT COUNT(*) as count FROM \`${t}\``);
        console.log(`   ✅ ${t}: ${rows[0].count} registros`);
      } catch (e) {
        console.log(`   ❌ ${t}: NO EXISTE (${e.message})`);
      }
    }

    // 6. Probar una consulta real como hace la pagina
    console.log("\n5. Consulta de prueba (como la hace la pagina)...");
    const [rows] = await conn.execute(
      "SELECT * FROM riego_hum_suelo ORDER BY fecha_lectura DESC LIMIT 1"
    );
    if (rows.length > 0) {
      console.log("   ✅ Ultimo valor de humedad del suelo:", rows[0].humedad_suelo);
    } else {
      console.log("   ⚠️ Tabla vacia (sin datos de prueba)");
    }

    await conn.end();
    console.log("\n✅ Diagnostico completo. Todo esta conectado correctamente.");
    console.log("   Si la pagina sigue sin mostrar datos, el problema es otro.");

  } catch (err) {
    console.log("\n❌ ERROR DE CONEXION:\n");
    console.log("   Mensaje:", err.message);
    console.log("   Codigo:", err.code);
    console.log("");

    if (err.code === "ECONNREFUSED") {
      console.log("💡 SOLUCION: MySQL no esta corriendo o esta en otro puerto.");
      console.log("   1. Abre XAMPP Control Panel");
      console.log("   2. Verifica que MySQL este en verde (Running)");
      console.log("   3. Haz clic en 'Config' al lado de MySQL -> my.ini");
      console.log("   4. Busca la linea 'port=' para ver el puerto real");
      console.log("   4. Edita el archivo .env con el puerto correcto:");
      console.log("      DATABASE_URL=mysql://root:@localhost:PUERTO/greenhouse");
    }

    if (err.code === "ER_ACCESS_DENIED_ERROR") {
      console.log("💡 SOLUCION: Usuario o contraseña incorrectos.");
      console.log("   Edita el archivo .env:");
      console.log("   DATABASE_URL=mysql://root:TU_CONTRASENA@localhost:3306/greenhouse");
    }

    if (err.code === "ER_BAD_DB_ERROR") {
      console.log("💡 SOLUCION: La base de datos no existe.");
      console.log("   Ve a phpMyAdmin -> Nueva -> 'greenhouse' -> Crear");
    }
  }
}

test();
