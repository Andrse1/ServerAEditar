import { z } from "zod";
import { createRouter, publicQuery } from "../middleware";
import { getDb } from "../queries/connection";
import { iluminacionPpfd, iluminacionDli, iluminacionEspectro, iluminacionDliCanales } from "@db/schema";
import { desc, gte, lte, and } from "drizzle-orm";

export const iluminacionRouter = createRouter({
  // ── PPFD ──
  ppfdUltimo: publicQuery.query(() => {
    const db = getDb();
    return db.select().from(iluminacionPpfd).orderBy(desc(iluminacionPpfd.fechaLectura)).limit(1);
  }),
  ppfdHistorico: publicQuery
    .input(z.object({ limit: z.number().min(1).max(200).default(50) }).optional())
    .query(({ input }) => {
      const db = getDb();
      return db.select().from(iluminacionPpfd).orderBy(desc(iluminacionPpfd.fechaLectura)).limit(input?.limit ?? 50);
    }),
  ppfdTabla: publicQuery.query(() => {
    const db = getDb();
    return db.select().from(iluminacionPpfd).orderBy(desc(iluminacionPpfd.fechaLectura)).limit(50);
  }),
  ppfdRango: publicQuery
    .input(z.object({ desde: z.string().datetime().optional(), hasta: z.string().datetime().optional() }))
    .mutation(({ input }) => {
      const db = getDb();
      const conditions = [];
      if (input.desde) conditions.push(gte(iluminacionPpfd.fechaLectura, new Date(input.desde)));
      if (input.hasta) conditions.push(lte(iluminacionPpfd.fechaLectura, new Date(input.hasta)));
      return db.select().from(iluminacionPpfd).where(conditions.length > 0 ? and(...conditions) : undefined).orderBy(desc(iluminacionPpfd.fechaLectura));
    }),
  ppfdInsertar: publicQuery
    .input(z.object({ ppfd: z.number(), focoEstado: z.number().optional() }))
    .mutation(({ input }) => {
      const db = getDb();
      return db.insert(iluminacionPpfd).values({ ppfd: input.ppfd, focoEstado: input.focoEstado ?? 0 });
    }),

  // ── DLI Total ──
  dliUltimo: publicQuery.query(() => {
    const db = getDb();
    return db.select().from(iluminacionDli).orderBy(desc(iluminacionDli.fechaLectura)).limit(1);
  }),
  dliHistorico: publicQuery
    .input(z.object({ limit: z.number().min(1).max(200).default(50) }).optional())
    .query(({ input }) => {
      const db = getDb();
      return db.select().from(iluminacionDli).orderBy(desc(iluminacionDli.fechaLectura)).limit(input?.limit ?? 50);
    }),
  dliTabla: publicQuery.query(() => {
    const db = getDb();
    return db.select().from(iluminacionDli).orderBy(desc(iluminacionDli.fechaLectura)).limit(50);
  }),
  dliRango: publicQuery
    .input(z.object({ desde: z.string().datetime().optional(), hasta: z.string().datetime().optional() }))
    .mutation(({ input }) => {
      const db = getDb();
      const conditions = [];
      if (input.desde) conditions.push(gte(iluminacionDli.fechaLectura, new Date(input.desde)));
      if (input.hasta) conditions.push(lte(iluminacionDli.fechaLectura, new Date(input.hasta)));
      return db.select().from(iluminacionDli).where(conditions.length > 0 ? and(...conditions) : undefined).orderBy(desc(iluminacionDli.fechaLectura));
    }),
  dliInsertar: publicQuery
    .input(z.object({ dliTotal: z.number(), dliBrutoTotal: z.number().optional() }))
    .mutation(({ input }) => {
      const db = getDb();
      return db.insert(iluminacionDli).values({ dliTotal: input.dliTotal, dliBrutoTotal: input.dliBrutoTotal ?? 0 });
    }),

  // ── Espectro PPFD por canales ──
  espectroUltimo: publicQuery.query(() => {
    const db = getDb();
    return db.select().from(iluminacionEspectro).orderBy(desc(iluminacionEspectro.fechaLectura)).limit(1);
  }),
  espectroHistorico: publicQuery
    .input(z.object({ limit: z.number().min(1).max(200).default(50) }).optional())
    .query(({ input }) => {
      const db = getDb();
      return db.select().from(iluminacionEspectro).orderBy(desc(iluminacionEspectro.fechaLectura)).limit(input?.limit ?? 50);
    }),
  espectroTabla: publicQuery.query(() => {
    const db = getDb();
    return db.select().from(iluminacionEspectro).orderBy(desc(iluminacionEspectro.fechaLectura)).limit(50);
  }),
  espectroRango: publicQuery
    .input(z.object({ desde: z.string().datetime().optional(), hasta: z.string().datetime().optional() }))
    .mutation(({ input }) => {
      const db = getDb();
      const conditions = [];
      if (input.desde) conditions.push(gte(iluminacionEspectro.fechaLectura, new Date(input.desde)));
      if (input.hasta) conditions.push(lte(iluminacionEspectro.fechaLectura, new Date(input.hasta)));
      return db.select().from(iluminacionEspectro).where(conditions.length > 0 ? and(...conditions) : undefined).orderBy(desc(iluminacionEspectro.fechaLectura));
    }),
  espectroInsertar: publicQuery
    .input(z.object({
      ch0: z.number().optional(), ch1: z.number().optional(),
      ch2: z.number().optional(), ch3: z.number().optional(),
      ch4: z.number().optional(), ch5: z.number().optional(),
      ch6: z.number().optional(), ch7: z.number().optional(),
    }))
    .mutation(({ input }) => {
      const db = getDb();
      return db.insert(iluminacionEspectro).values({
        ch0: input.ch0 ?? 0, ch1: input.ch1 ?? 0, ch2: input.ch2 ?? 0, ch3: input.ch3 ?? 0,
        ch4: input.ch4 ?? 0, ch5: input.ch5 ?? 0, ch6: input.ch6 ?? 0, ch7: input.ch7 ?? 0,
      });
    }),

  // ── DLI por canales ──
  dliCanalesUltimo: publicQuery.query(() => {
    const db = getDb();
    return db.select().from(iluminacionDliCanales).orderBy(desc(iluminacionDliCanales.fechaLectura)).limit(1);
  }),
  dliCanalesHistorico: publicQuery
    .input(z.object({ limit: z.number().min(1).max(200).default(50) }).optional())
    .query(({ input }) => {
      const db = getDb();
      return db.select().from(iluminacionDliCanales).orderBy(desc(iluminacionDliCanales.fechaLectura)).limit(input?.limit ?? 50);
    }),
  dliCanalesTabla: publicQuery.query(() => {
    const db = getDb();
    return db.select().from(iluminacionDliCanales).orderBy(desc(iluminacionDliCanales.fechaLectura)).limit(50);
  }),
  dliCanalesInsertar: publicQuery
    .input(z.object({
      ch0: z.number().optional(), ch1: z.number().optional(),
      ch2: z.number().optional(), ch3: z.number().optional(),
      ch4: z.number().optional(), ch5: z.number().optional(),
      ch6: z.number().optional(), ch7: z.number().optional(),
    }))
    .mutation(({ input }) => {
      const db = getDb();
      return db.insert(iluminacionDliCanales).values({
        ch0: input.ch0 ?? 0, ch1: input.ch1 ?? 0, ch2: input.ch2 ?? 0, ch3: input.ch3 ?? 0,
        ch4: input.ch4 ?? 0, ch5: input.ch5 ?? 0, ch6: input.ch6 ?? 0, ch7: input.ch7 ?? 0,
      });
    }),
});
