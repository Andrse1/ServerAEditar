import { z } from "zod";
import { createRouter, publicQuery } from "../middleware";
import { getDb } from "../queries/connection";
import { nebulizadorHumedad, nebulizadorTemperatura, nebulizadorControl } from "@db/schema";
import { desc, gte, lte, and } from "drizzle-orm";

export const nebulizadorRouter = createRouter({
  // ═══════════════════════════════════════════
  // HUMEDAD
  // ═══════════════════════════════════════════
  humedadHistorico: publicQuery
    .input(z.object({ limit: z.number().min(1).max(200).default(50) }).optional())
    .query(({ input }) => {
      const db = getDb();
      const limit = input?.limit ?? 50;
      return db.select().from(nebulizadorHumedad).orderBy(desc(nebulizadorHumedad.fechaLectura)).limit(limit);
    }),

  humedadTabla: publicQuery
    .query(() => {
      const db = getDb();
      return db.select().from(nebulizadorHumedad).orderBy(desc(nebulizadorHumedad.fechaLectura)).limit(50);
    }),

  humedadRango: publicQuery
    .input(z.object({
      desde: z.string().datetime().optional(),
      hasta: z.string().datetime().optional(),
    }))
    .mutation(({ input }) => {
      const db = getDb();
      const conditions = [];
      if (input.desde) conditions.push(gte(nebulizadorHumedad.fechaLectura, new Date(input.desde)));
      if (input.hasta) conditions.push(lte(nebulizadorHumedad.fechaLectura, new Date(input.hasta)));
      return db.select().from(nebulizadorHumedad)
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(desc(nebulizadorHumedad.fechaLectura));
    }),

  humedadInsertar: publicQuery
    .input(z.object({ humedad: z.number() }))
    .mutation(({ input }) => {
      const db = getDb();
      return db.insert(nebulizadorHumedad).values({ humedad: input.humedad });
    }),

  humedadUltimo: publicQuery
    .query(() => {
      const db = getDb();
      return db.select().from(nebulizadorHumedad).orderBy(desc(nebulizadorHumedad.fechaLectura)).limit(1);
    }),

  // ═══════════════════════════════════════════
  // TEMPERATURA
  // ═══════════════════════════════════════════
  temperaturaHistorico: publicQuery
    .input(z.object({ limit: z.number().min(1).max(200).default(50) }).optional())
    .query(({ input }) => {
      const db = getDb();
      const limit = input?.limit ?? 50;
      return db.select().from(nebulizadorTemperatura).orderBy(desc(nebulizadorTemperatura.fechaLectura)).limit(limit);
    }),

  temperaturaTabla: publicQuery
    .query(() => {
      const db = getDb();
      return db.select().from(nebulizadorTemperatura).orderBy(desc(nebulizadorTemperatura.fechaLectura)).limit(50);
    }),

  temperaturaRango: publicQuery
    .input(z.object({
      desde: z.string().datetime().optional(),
      hasta: z.string().datetime().optional(),
    }))
    .mutation(({ input }) => {
      const db = getDb();
      const conditions = [];
      if (input.desde) conditions.push(gte(nebulizadorTemperatura.fechaLectura, new Date(input.desde)));
      if (input.hasta) conditions.push(lte(nebulizadorTemperatura.fechaLectura, new Date(input.hasta)));
      return db.select().from(nebulizadorTemperatura)
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(desc(nebulizadorTemperatura.fechaLectura));
    }),

  temperaturaInsertar: publicQuery
    .input(z.object({ temperatura: z.number() }))
    .mutation(({ input }) => {
      const db = getDb();
      return db.insert(nebulizadorTemperatura).values({ temperatura: input.temperatura });
    }),

  temperaturaUltimo: publicQuery
    .query(() => {
      const db = getDb();
      return db.select().from(nebulizadorTemperatura).orderBy(desc(nebulizadorTemperatura.fechaLectura)).limit(1);
    }),

  // ═══════════════════════════════════════════
  // CONTROL MANUAL DE ASPERSORES
  // ═══════════════════════════════════════════
  // Devuelve el ultimo estado de control registrado (o el valor por defecto
  // "auto / apagado" si todavia no hay ninguno).
  controlEstado: publicQuery
    .query(async () => {
      const db = getDb();
      const rows = await db.select().from(nebulizadorControl)
        .orderBy(desc(nebulizadorControl.fechaActualizacion)).limit(1);
      return rows[0] ?? { id: 0, modo: "auto" as const, aspersores: 0, fechaActualizacion: new Date() };
    }),

  // Registra un nuevo estado de control. El nodo ESP leera la fila mas
  // reciente para decidir como operar los aspersores.
  controlSet: publicQuery
    .input(z.object({
      modo: z.enum(["auto", "manual"]),
      aspersores: z.union([z.literal(0), z.literal(1)]),
    }))
    .mutation(({ input }) => {
      const db = getDb();
      return db.insert(nebulizadorControl).values({
        modo: input.modo,
        // En modo automatico el campo aspersores no aplica: lo dejamos en 0.
        aspersores: input.modo === "manual" ? input.aspersores : 0,
      });
    }),
});
