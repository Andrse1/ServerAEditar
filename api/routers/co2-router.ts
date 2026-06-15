import { z } from "zod";
import { createRouter, publicQuery } from "../middleware";
import { getDb } from "../queries/connection";
import {
  co2Zona1Temperatura, co2Zona1Humedad, co2Zona1Concentracion,
  co2Zona2Temperatura, co2Zona2Humedad, co2Zona2Concentracion,
} from "@db/schema";
import { desc, gte, lte, and } from "drizzle-orm";

// Helper for standard CRUD endpoints
function historico(tabla: any, campoFecha: any) {
  return publicQuery
    .input(z.object({ limit: z.number().min(1).max(200).default(50) }).optional())
    .query(({ input }: { input?: { limit?: number } }) => {
      const db = getDb();
      return db.select().from(tabla).orderBy(desc(campoFecha)).limit(input?.limit ?? 50);
    });
}

function tabla(tabla: any, campoFecha: any) {
  return publicQuery.query(() => {
    const db = getDb();
    return db.select().from(tabla).orderBy(desc(campoFecha)).limit(50);
  });
}

function ultimo(tabla: any, campoFecha: any) {
  return publicQuery.query(() => {
    const db = getDb();
    return db.select().from(tabla).orderBy(desc(campoFecha)).limit(1);
  });
}

function rango(tabla: any, campoFecha: any) {
  return publicQuery
    .input(z.object({ desde: z.string().datetime().optional(), hasta: z.string().datetime().optional() }))
    .mutation(({ input }: { input: { desde?: string; hasta?: string } }) => {
      const db = getDb();
      const conditions = [];
      if (input.desde) conditions.push(gte(campoFecha, new Date(input.desde)));
      if (input.hasta) conditions.push(lte(campoFecha, new Date(input.hasta)));
      return db.select().from(tabla)
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(desc(campoFecha));
    });
}

export const co2Router = createRouter({
  // ═══════════════════════════════════════════
  // ZONA 1
  // ═══════════════════════════════════════════
  zona1TemperaturaUltimo: ultimo(co2Zona1Temperatura, co2Zona1Temperatura.fechaLectura),
  zona1TemperaturaHistorico: historico(co2Zona1Temperatura, co2Zona1Temperatura.fechaLectura),
  zona1TemperaturaTabla: tabla(co2Zona1Temperatura, co2Zona1Temperatura.fechaLectura),
  zona1TemperaturaRango: rango(co2Zona1Temperatura, co2Zona1Temperatura.fechaLectura),

  zona1HumedadUltimo: ultimo(co2Zona1Humedad, co2Zona1Humedad.fechaLectura),
  zona1HumedadHistorico: historico(co2Zona1Humedad, co2Zona1Humedad.fechaLectura),
  zona1HumedadTabla: tabla(co2Zona1Humedad, co2Zona1Humedad.fechaLectura),
  zona1HumedadRango: rango(co2Zona1Humedad, co2Zona1Humedad.fechaLectura),

  zona1Co2Ultimo: ultimo(co2Zona1Concentracion, co2Zona1Concentracion.fechaLectura),
  zona1Co2Historico: historico(co2Zona1Concentracion, co2Zona1Concentracion.fechaLectura),
  zona1Co2Tabla: tabla(co2Zona1Concentracion, co2Zona1Concentracion.fechaLectura),
  zona1Co2Rango: rango(co2Zona1Concentracion, co2Zona1Concentracion.fechaLectura),

  zona1InsertarTemp: publicQuery
    .input(z.object({ temperatura: z.number() }))
    .mutation(({ input }) => {
      const db = getDb();
      return db.insert(co2Zona1Temperatura).values({ temperatura: input.temperatura });
    }),
  zona1InsertarHum: publicQuery
    .input(z.object({ humedad: z.number() }))
    .mutation(({ input }) => {
      const db = getDb();
      return db.insert(co2Zona1Humedad).values({ humedad: input.humedad });
    }),
  zona1InsertarCo2: publicQuery
    .input(z.object({ co2Ppm: z.number() }))
    .mutation(({ input }) => {
      const db = getDb();
      return db.insert(co2Zona1Concentracion).values({ co2Ppm: input.co2Ppm });
    }),

  // ═══════════════════════════════════════════
  // ZONA 2
  // ═══════════════════════════════════════════
  zona2TemperaturaUltimo: ultimo(co2Zona2Temperatura, co2Zona2Temperatura.fechaLectura),
  zona2TemperaturaHistorico: historico(co2Zona2Temperatura, co2Zona2Temperatura.fechaLectura),
  zona2TemperaturaTabla: tabla(co2Zona2Temperatura, co2Zona2Temperatura.fechaLectura),
  zona2TemperaturaRango: rango(co2Zona2Temperatura, co2Zona2Temperatura.fechaLectura),

  zona2HumedadUltimo: ultimo(co2Zona2Humedad, co2Zona2Humedad.fechaLectura),
  zona2HumedadHistorico: historico(co2Zona2Humedad, co2Zona2Humedad.fechaLectura),
  zona2HumedadTabla: tabla(co2Zona2Humedad, co2Zona2Humedad.fechaLectura),
  zona2HumedadRango: rango(co2Zona2Humedad, co2Zona2Humedad.fechaLectura),

  zona2Co2Ultimo: ultimo(co2Zona2Concentracion, co2Zona2Concentracion.fechaLectura),
  zona2Co2Historico: historico(co2Zona2Concentracion, co2Zona2Concentracion.fechaLectura),
  zona2Co2Tabla: tabla(co2Zona2Concentracion, co2Zona2Concentracion.fechaLectura),
  zona2Co2Rango: rango(co2Zona2Concentracion, co2Zona2Concentracion.fechaLectura),

  zona2InsertarTemp: publicQuery
    .input(z.object({ temperatura: z.number() }))
    .mutation(({ input }) => {
      const db = getDb();
      return db.insert(co2Zona2Temperatura).values({ temperatura: input.temperatura });
    }),
  zona2InsertarHum: publicQuery
    .input(z.object({ humedad: z.number() }))
    .mutation(({ input }) => {
      const db = getDb();
      return db.insert(co2Zona2Humedad).values({ humedad: input.humedad });
    }),
  zona2InsertarCo2: publicQuery
    .input(z.object({ co2Ppm: z.number() }))
    .mutation(({ input }) => {
      const db = getDb();
      return db.insert(co2Zona2Concentracion).values({ co2Ppm: input.co2Ppm });
    }),
});
