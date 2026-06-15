import { drizzle } from "drizzle-orm/mysql2";
import {
  co2Zona1Temperatura, co2Zona1Humedad, co2Zona1Concentracion,
  co2Zona2Temperatura, co2Zona2Humedad, co2Zona2Concentracion,
  nebulizadorHumedad,
  iluminacionPpfd, iluminacionDli, iluminacionEspectro, iluminacionDliCanales,
  riegoTempSuelo, riegoTempAmbiente, riegoHumAmbiente,
  riegoHumSuelo, riegoPotasio, riegoFosforo, riegoNitrogeno,
} from "./schema";

const databaseUrl = process.env.DATABASE_URL || "mysql://root:@localhost:3306/greenhouse";
const db = drizzle(databaseUrl);

async function seed() {
  console.log("Seeding database with sample greenhouse data...");

  const now = new Date();
  const timestamps: Date[] = [];
  for (let i = 29; i >= 0; i--) {
    timestamps.push(new Date(now.getTime() - i * 5 * 60000));
  }

  // ========== CO2 Zona 1 ==========
  console.log("Seeding CO2 Zona 1...");
  const z1Hum = [65, 67, 64, 68, 70, 72, 69, 66, 63, 65, 68, 71, 73, 70, 67, 64, 62, 65, 68, 70, 72, 69, 66, 64, 67, 70, 68, 65, 63, 66];
  const z1Temp = [22.5, 23.1, 22.8, 23.5, 24.2, 24.8, 24.0, 23.3, 22.9, 23.2, 23.8, 24.5, 25.1, 24.6, 23.9, 23.1, 22.7, 23.0, 23.6, 24.3, 24.9, 24.4, 23.7, 23.2, 22.8, 23.4, 24.0, 23.5, 22.9, 23.3];
  const z1Co2 = [400, 420, 410, 430, 450, 470, 460, 440, 420, 410, 430, 460, 480, 470, 450, 430, 410, 420, 440, 460, 490, 480, 460, 440, 420, 440, 470, 450, 430, 440];
  for (let i = 0; i < 30; i++) {
    await db.insert(co2Zona1Humedad).values({ humedad: z1Hum[i], fechaLectura: timestamps[i] });
    await db.insert(co2Zona1Temperatura).values({ temperatura: z1Temp[i], fechaLectura: timestamps[i] });
    await db.insert(co2Zona1Concentracion).values({ co2Ppm: z1Co2[i], fechaLectura: timestamps[i] });
  }

  // ========== CO2 Zona 2 ==========
  console.log("Seeding CO2 Zona 2...");
  const z2Hum = [63, 65, 62, 66, 68, 70, 67, 64, 61, 63, 66, 69, 71, 68, 65, 62, 60, 63, 66, 68, 70, 67, 64, 62, 65, 68, 66, 63, 61, 64];
  const z2Temp = [21.5, 22.1, 21.8, 22.5, 23.2, 23.8, 23.0, 22.3, 21.9, 22.2, 22.8, 23.5, 24.1, 23.6, 22.9, 22.1, 21.7, 22.0, 22.6, 23.3, 23.9, 23.4, 22.7, 22.2, 21.8, 22.4, 23.0, 22.5, 21.9, 22.3];
  const z2Co2 = [380, 400, 390, 410, 430, 450, 440, 420, 400, 390, 410, 440, 460, 450, 430, 410, 390, 400, 420, 440, 470, 460, 440, 420, 400, 420, 450, 430, 410, 420];
  for (let i = 0; i < 30; i++) {
    await db.insert(co2Zona2Humedad).values({ humedad: z2Hum[i], fechaLectura: timestamps[i] });
    await db.insert(co2Zona2Temperatura).values({ temperatura: z2Temp[i], fechaLectura: timestamps[i] });
    await db.insert(co2Zona2Concentracion).values({ co2Ppm: z2Co2[i], fechaLectura: timestamps[i] });
  }

  // ========== Nebulizador ==========
  console.log("Seeding Nebulizador...");
  const nebHum = [78, 80, 82, 85, 83, 81, 79, 77, 75, 76, 78, 80, 84, 86, 84, 82, 80, 78, 76, 77, 79, 81, 85, 83, 81, 79, 77, 78, 80, 82];
  for (let i = 0; i < 30; i++) {
    await db.insert(nebulizadorHumedad).values({ humedad: nebHum[i], fechaLectura: timestamps[i] });
  }

  // ========== Iluminacion ==========
  console.log("Seeding Iluminacion...");
  const ppfdValues = [325.4, 318.2, 310.7, 298.1, 305.5, 312.3, 320.1, 315.6, 308.2, 295.4, 302.1, 315.7, 322.4, 318.9, 305.2, 298.7, 310.5, 325.1, 320.8, 312.4, 300.2, 308.9, 318.5, 324.1, 319.7, 307.3, 295.8, 303.4, 315.2, 321.6];
  const dliTotal = [12.45, 12.38, 12.30, 12.15, 12.05, 12.50, 12.75, 12.68, 12.55, 12.35, 12.20, 12.60, 12.85, 12.78, 12.58, 12.40, 12.55, 12.90, 12.82, 12.70, 12.48, 12.35, 12.72, 12.95, 12.88, 12.65, 12.42, 12.58, 12.80, 12.92];
  const dliBruto = [13.20, 13.10, 13.00, 12.85, 12.70, 13.30, 13.60, 13.50, 13.35, 13.10, 12.95, 13.40, 13.70, 13.60, 13.35, 13.15, 13.35, 13.75, 13.65, 13.50, 13.25, 13.10, 13.55, 13.80, 13.70, 13.45, 13.18, 13.38, 13.65, 13.78];

  for (let i = 0; i < 30; i++) {
    await db.insert(iluminacionPpfd).values({
      ppfd: ppfdValues[i],
      focoEstado: i % 5 === 0 ? 0 : 1,
      fechaLectura: timestamps[i],
    });
    await db.insert(iluminacionDli).values({
      dliTotal: dliTotal[i],
      dliBrutoTotal: dliBruto[i],
      fechaLectura: timestamps[i],
    });
  }

  // Espectro (PPFD por canales)
  const canalesBase = [3200, 5800, 4200, 2100, 1800, 2400, 8500, 7200];
  for (let i = 0; i < 30; i++) {
    const chValues = canalesBase.map(base => Math.max(0, base + (Math.random() - 0.5) * 400));
    await db.insert(iluminacionEspectro).values({
      ch0: chValues[0], ch1: chValues[1], ch2: chValues[2], ch3: chValues[3],
      ch4: chValues[4], ch5: chValues[5], ch6: chValues[6], ch7: chValues[7],
      fechaLectura: timestamps[i],
    });
  }

  // DLI por canales
  const dliChBase = [0.52, 1.69, 1.82, 1.17, 1.04, 1.30, 3.12, 2.34];
  for (let i = 0; i < 30; i++) {
    const dliChValues = dliChBase.map(base => Math.max(0, base + (Math.random() - 0.5) * 0.15));
    await db.insert(iluminacionDliCanales).values({
      ch0: dliChValues[0], ch1: dliChValues[1], ch2: dliChValues[2], ch3: dliChValues[3],
      ch4: dliChValues[4], ch5: dliChValues[5], ch6: dliChValues[6], ch7: dliChValues[7],
      fechaLectura: timestamps[i],
    });
  }

  // ========== Sistema de Riego ==========
  console.log("Seeding Sistema de Riego...");
  const riegoTS = [18.5, 19.2, 20.1, 21.3, 22.0, 21.5, 20.8, 19.9, 19.0, 18.6, 19.5, 20.8, 21.8, 22.5, 23.0, 22.4, 21.6, 20.5, 19.8, 19.2, 20.0, 21.2, 22.0, 22.8, 23.2, 22.6, 21.8, 20.8, 20.0, 19.5];
  const riegoTA = [23.5, 24.1, 24.8, 25.5, 26.2, 25.8, 25.0, 24.3, 23.8, 23.4, 24.0, 24.9, 25.8, 26.5, 27.0, 26.6, 25.8, 24.9, 24.2, 23.7, 24.3, 25.2, 26.0, 26.8, 27.2, 26.7, 25.9, 25.0, 24.3, 23.8];
  const riegoHA = [60, 62, 65, 68, 70, 72, 69, 66, 63, 61, 64, 67, 70, 73, 75, 72, 69, 66, 63, 61, 64, 68, 71, 74, 76, 73, 70, 67, 64, 62];
  const riegoHS = [45, 47, 50, 52, 55, 53, 51, 48, 46, 44, 47, 50, 53, 56, 58, 55, 52, 49, 46, 44, 48, 51, 54, 57, 59, 56, 53, 50, 47, 45];
  const riegoK = [120, 125, 130, 128, 135, 140, 138, 132, 127, 122, 128, 134, 139, 142, 145, 140, 136, 130, 126, 123, 129, 135, 140, 143, 146, 141, 137, 132, 128, 125];
  const riegoP = [15, 16, 17, 16, 18, 19, 18, 17, 16, 15, 16, 17, 19, 20, 21, 19, 18, 17, 16, 15, 16, 18, 19, 20, 21, 19, 18, 17, 16, 16];
  const riegoN = [80, 82, 85, 83, 88, 90, 87, 84, 81, 79, 83, 87, 91, 93, 95, 91, 88, 84, 81, 79, 83, 88, 92, 94, 96, 92, 89, 85, 82, 80];

  for (let i = 0; i < 30; i++) {
    await db.insert(riegoTempSuelo).values({ temperaturaSuelo: riegoTS[i], fechaLectura: timestamps[i] });
    await db.insert(riegoTempAmbiente).values({ temperaturaAmbiente: riegoTA[i], fechaLectura: timestamps[i] });
    await db.insert(riegoHumAmbiente).values({ humedadAmbiente: riegoHA[i], fechaLectura: timestamps[i] });
    await db.insert(riegoHumSuelo).values({ humedadSuelo: riegoHS[i], fechaLectura: timestamps[i] });
    await db.insert(riegoPotasio).values({ potasio: riegoK[i], fechaLectura: timestamps[i] });
    await db.insert(riegoFosforo).values({ fosforo: riegoP[i], fechaLectura: timestamps[i] });
    await db.insert(riegoNitrogeno).values({ nitrogeno: riegoN[i], fechaLectura: timestamps[i] });
  }

  console.log("Database seeded successfully!");
}

seed().catch(console.error);
