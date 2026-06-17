import { format as dfFormat } from "date-fns";
import { es } from "date-fns/locale";

// ════════════════════════════════════════════════════════════════════════
// Manejo de fechas de las lecturas
// ════════════════════════════════════════════════════════════════════════
// El backend entrega `fecha_lectura` como una CADENA de reloj de pared
// "YYYY-MM-DD HH:mm:ss" exactamente como esta en la base de datos (ver
// `api/queries/connection.ts` -> dateStrings y `db/schema.ts` -> mode:"string").
//
// El objetivo es que la hora mostrada en graficas y tablas sea EXACTAMENTE la
// que quedo registrada en la BD, sin aplicar ninguna conversion de zona
// horaria. Para lograrlo construimos el Date a partir de los componentes
// literales (ano, mes, dia, hora, minuto, segundo) usando el constructor en
// hora local. Asi date-fns formatea esos mismos numeros tal cual.

/**
 * Convierte el valor que llega del backend en un Date cuyos componentes
 * locales coinciden con los numeros guardados en la base de datos.
 *
 * - Cadena de reloj de pared "YYYY-MM-DD HH:mm:ss" (sin zona): se interpreta
 *   literalmente (sin conversion de huso). Este es el caso de `fecha_lectura`.
 * - Cadena ISO con zona ("...Z" o "+/-HH:MM"): se interpreta como instante
 *   real (p. ej. los ciclos creados con `toISOString()`), y al formatear se
 *   muestra en la hora local del navegador.
 * - Date: se devuelve tal cual.
 */
export function parseFechaLectura(value: unknown): Date {
  if (value instanceof Date) return value;

  if (typeof value === "string") {
    const trimmed = value.trim();
    const tieneZona = /[zZ]$|[+-]\d{2}:?\d{2}$/.test(trimmed);

    if (!tieneZona) {
      const m = trimmed.match(
        /^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})(?::(\d{2})(?:\.\d+)?)?$/,
      );
      if (m) {
        const [, y, mo, d, h, mi, s] = m;
        return new Date(
          Number(y),
          Number(mo) - 1,
          Number(d),
          Number(h),
          Number(mi),
          Number(s ?? "0"),
        );
      }
    }

    const parsed = new Date(trimmed);
    if (!isNaN(parsed.getTime())) return parsed;
  }

  return new Date(NaN);
}

/**
 * Formatea una `fecha_lectura` para mostrarla. Por defecto usa el formato
 * completo de las tablas; pasa un patron distinto (p. ej. "HH:mm") para los
 * ejes de tiempo de las graficas.
 */
export function formatFecha(value: unknown, pattern = "dd/MM/yyyy HH:mm:ss"): string {
  const d = parseFechaLectura(value);
  if (isNaN(d.getTime())) return value == null ? "—" : String(value);
  return dfFormat(d, pattern, { locale: es });
}

/**
 * Convierte un Date a cadena de reloj de pared "YYYY-MM-DD HH:mm:ss" en hora
 * local (sin zona) — el mismo formato con el que la base de datos guarda las
 * marcas de tiempo. Util para construir los limites de los filtros por rango
 * de modo que se comparen reloj-de-pared contra reloj-de-pared.
 */
export function toWallClock(d: Date): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return (
    `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ` +
    `${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`
  );
}
