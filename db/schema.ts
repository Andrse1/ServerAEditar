import {
  mysqlTable,
  mysqlEnum,
  serial,
  float,
  int,
  timestamp,
  varchar,
  text,
} from "drizzle-orm/mysql-core";

// ============================================================================
// Auth tables (required by backend infrastructure)
// ============================================================================
export const users = mysqlTable("users", {
  id: serial("id").primaryKey(),
  unionId: varchar("unionId", { length: 255 }).notNull().unique(),
  name: varchar("name", { length: 255 }),
  email: varchar("email", { length: 320 }),
  avatar: text("avatar"),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull().$onUpdate(() => new Date()),
  lastSignInAt: timestamp("lastSignInAt").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// ============================================================================
// PROYECTO 1: CO2 / SENSOR DE GASES — 2 ZONAS
// Datalogger IDs:
//   Zona 1: ID 20 = gas1_temperatura + gas1_humedad
//           ID 21 = gas1_co2
//   Zona 2: ID 22 = gas2_temperatura + gas2_humedad
//           ID 23 = gas2_co2
// ============================================================================

// ── Zona 1 ──
export const co2Zona1Temperatura = mysqlTable("co2_zona1_temperatura", {
  id: serial("id").primaryKey(),
  temperatura: float("temperatura").notNull(),
  fechaLectura: timestamp("fecha_lectura").defaultNow().notNull(),
});

export const co2Zona1Humedad = mysqlTable("co2_zona1_humedad", {
  id: serial("id").primaryKey(),
  humedad: float("humedad").notNull(),
  fechaLectura: timestamp("fecha_lectura").defaultNow().notNull(),
});

export const co2Zona1Concentracion = mysqlTable("co2_zona1_concentracion", {
  id: serial("id").primaryKey(),
  co2Ppm: float("co2_ppm").notNull(),
  fechaLectura: timestamp("fecha_lectura").defaultNow().notNull(),
});

// ── Zona 2 ──
export const co2Zona2Temperatura = mysqlTable("co2_zona2_temperatura", {
  id: serial("id").primaryKey(),
  temperatura: float("temperatura").notNull(),
  fechaLectura: timestamp("fecha_lectura").defaultNow().notNull(),
});

export const co2Zona2Humedad = mysqlTable("co2_zona2_humedad", {
  id: serial("id").primaryKey(),
  humedad: float("humedad").notNull(),
  fechaLectura: timestamp("fecha_lectura").defaultNow().notNull(),
});

export const co2Zona2Concentracion = mysqlTable("co2_zona2_concentracion", {
  id: serial("id").primaryKey(),
  co2Ppm: float("co2_ppm").notNull(),
  fechaLectura: timestamp("fecha_lectura").defaultNow().notNull(),
});

export type Co2Zona1Temperatura = typeof co2Zona1Temperatura.$inferSelect;
export type Co2Zona1Humedad = typeof co2Zona1Humedad.$inferSelect;
export type Co2Zona1Concentracion = typeof co2Zona1Concentracion.$inferSelect;
export type Co2Zona2Temperatura = typeof co2Zona2Temperatura.$inferSelect;
export type Co2Zona2Humedad = typeof co2Zona2Humedad.$inferSelect;
export type Co2Zona2Concentracion = typeof co2Zona2Concentracion.$inferSelect;

// ============================================================================
// PROYECTO 2: NEBULIZADOR (modulo bomba)
// El datalogger envia campos con nombre (no id_grupo):
//   ID 24 -> bomba_temperatura  -> nebulizador_temperatura
//            bomba_humedad      -> nebulizador_humedad
//   ID 25 -> bomba_estado + bomba_sensores_validos -> nebulizador_bomba
// ============================================================================
export const nebulizadorHumedad = mysqlTable("nebulizador_humedad", {
  id: serial("id").primaryKey(),
  humedad: float("humedad").notNull(),
  fechaLectura: timestamp("fecha_lectura").defaultNow().notNull(),
});

export const nebulizadorTemperatura = mysqlTable("nebulizador_temperatura", {
  id: serial("id").primaryKey(),
  temperatura: float("temperatura").notNull(),
  fechaLectura: timestamp("fecha_lectura").defaultNow().notNull(),
});

// Estado de la bomba reportado por el dispositivo (ID 25).
//   estado:           1 = encendida, 0 = apagada
//   sensoresValidos:  numero de sensores que respondieron (0-4)
export const nebulizadorBomba = mysqlTable("nebulizador_bomba", {
  id: serial("id").primaryKey(),
  estado: int("estado").notNull().default(0),
  sensoresValidos: int("sensores_validos").notNull().default(0),
  fechaLectura: timestamp("fecha_lectura").defaultNow().notNull(),
});

// Control manual de los aspersores/nebulizadores (append-only).
// La web inserta una nueva fila al cambiar el estado; el nodo ESP lee la
// fila mas reciente para saber si debe operar en modo automatico o si el
// usuario forzo el encendido/apagado manual de los aspersores.
//   modo:       "auto"   -> el nodo decide segun humedad
//               "manual" -> respeta el campo aspersores
//   aspersores: 0 = apagados, 1 = encendidos (solo aplica en modo manual)
export const nebulizadorControl = mysqlTable("nebulizador_control", {
  id: serial("id").primaryKey(),
  modo: mysqlEnum("modo", ["auto", "manual"]).default("auto").notNull(),
  aspersores: int("aspersores").notNull().default(0),
  fechaActualizacion: timestamp("fecha_actualizacion").defaultNow().notNull(),
});

export type NebulizadorHumedad = typeof nebulizadorHumedad.$inferSelect;
export type NebulizadorTemperatura = typeof nebulizadorTemperatura.$inferSelect;
export type NebulizadorBomba = typeof nebulizadorBomba.$inferSelect;
export type NebulizadorControl = typeof nebulizadorControl.$inferSelect;

// ============================================================================
// PROYECTO 3: ILUMINACION (PhytoSense)
// Datalogger IDs:
//   ID 10: ppfd_total + foco_estado       -> iluminacion_ppfd
//   ID 11: dli_total + dli_excedente      -> iluminacion_dli
//   IDs 12-15: ppfd_ch0-7 (en pares)      -> iluminacion_espectro (UPSERT)
//   IDs 16-19: dli_ch0-7 (en pares)       -> iluminacion_dli_canales (UPSERT)
// ============================================================================

export const iluminacionPpfd = mysqlTable("iluminacion_ppfd", {
  id: serial("id").primaryKey(),
  ppfd: float("ppfd").notNull(),
  focoEstado: float("foco_estado").notNull().default(0),
  fechaLectura: timestamp("fecha_lectura").defaultNow().notNull(),
});

export const iluminacionDli = mysqlTable("iluminacion_dli", {
  id: serial("id").primaryKey(),
  dliTotal: float("dli_total").notNull(),
  dliBrutoTotal: float("dli_bruto_total").notNull().default(0),
  fechaLectura: timestamp("fecha_lectura").defaultNow().notNull(),
});

export const iluminacionEspectro = mysqlTable("iluminacion_espectro", {
  id: serial("id").primaryKey(),
  ch0: float("ch0").notNull().default(0),
  ch1: float("ch1").notNull().default(0),
  ch2: float("ch2").notNull().default(0),
  ch3: float("ch3").notNull().default(0),
  ch4: float("ch4").notNull().default(0),
  ch5: float("ch5").notNull().default(0),
  ch6: float("ch6").notNull().default(0),
  ch7: float("ch7").notNull().default(0),
  fechaLectura: timestamp("fecha_lectura").defaultNow().notNull(),
});

// DLI por canales (IDs 16-19 del datalogger)
export const iluminacionDliCanales = mysqlTable("iluminacion_dli_canales", {
  id: serial("id").primaryKey(),
  ch0: float("ch0").notNull().default(0),
  ch1: float("ch1").notNull().default(0),
  ch2: float("ch2").notNull().default(0),
  ch3: float("ch3").notNull().default(0),
  ch4: float("ch4").notNull().default(0),
  ch5: float("ch5").notNull().default(0),
  ch6: float("ch6").notNull().default(0),
  ch7: float("ch7").notNull().default(0),
  fechaLectura: timestamp("fecha_lectura").defaultNow().notNull(),
});

export type IluminacionPpfd = typeof iluminacionPpfd.$inferSelect;
export type IluminacionDli = typeof iluminacionDli.$inferSelect;
export type IluminacionEspectro = typeof iluminacionEspectro.$inferSelect;
export type IluminacionDliCanales = typeof iluminacionDliCanales.$inferSelect;

// ============================================================================
// PROYECTO 4: SISTEMA DE RIEGO
// Datalogger IDs: 40-46 (legacy - ESP-NOW not yet implemented in riego code)
//   ID 40 = temperatura_suelo, ID 41 = temperatura_ambiente
//   ID 42 = humedad_ambiente,  ID 43 = humedad_suelo
//   ID 44 = potasio,           ID 45 = fosforo
//   ID 46 = nitrogeno
// ============================================================================
export const riegoTempSuelo = mysqlTable("riego_temp_suelo", {
  id: serial("id").primaryKey(),
  temperaturaSuelo: float("temperatura_suelo").notNull(),
  fechaLectura: timestamp("fecha_lectura").defaultNow().notNull(),
});

export const riegoTempAmbiente = mysqlTable("riego_temp_ambiente", {
  id: serial("id").primaryKey(),
  temperaturaAmbiente: float("temperatura_ambiente").notNull(),
  fechaLectura: timestamp("fecha_lectura").defaultNow().notNull(),
});

export const riegoHumAmbiente = mysqlTable("riego_hum_ambiente", {
  id: serial("id").primaryKey(),
  humedadAmbiente: float("humedad_ambiente").notNull(),
  fechaLectura: timestamp("fecha_lectura").defaultNow().notNull(),
});

export const riegoHumSuelo = mysqlTable("riego_hum_suelo", {
  id: serial("id").primaryKey(),
  humedadSuelo: float("humedad_suelo").notNull(),
  fechaLectura: timestamp("fecha_lectura").defaultNow().notNull(),
});

export const riegoPotasio = mysqlTable("riego_potasio", {
  id: serial("id").primaryKey(),
  potasio: float("potasio").notNull(),
  fechaLectura: timestamp("fecha_lectura").defaultNow().notNull(),
});

export const riegoFosforo = mysqlTable("riego_fosforo", {
  id: serial("id").primaryKey(),
  fosforo: float("fosforo").notNull(),
  fechaLectura: timestamp("fecha_lectura").defaultNow().notNull(),
});

export const riegoNitrogeno = mysqlTable("riego_nitrogeno", {
  id: serial("id").primaryKey(),
  nitrogeno: float("nitrogeno").notNull(),
  fechaLectura: timestamp("fecha_lectura").defaultNow().notNull(),
});

export type RiegoTempSuelo = typeof riegoTempSuelo.$inferSelect;
export type RiegoTempAmbiente = typeof riegoTempAmbiente.$inferSelect;
export type RiegoHumAmbiente = typeof riegoHumAmbiente.$inferSelect;
export type RiegoHumSuelo = typeof riegoHumSuelo.$inferSelect;
export type RiegoPotasio = typeof riegoPotasio.$inferSelect;
export type RiegoFosforo = typeof riegoFosforo.$inferSelect;
export type RiegoNitrogeno = typeof riegoNitrogeno.$inferSelect;
