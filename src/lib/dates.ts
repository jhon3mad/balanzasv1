export const ZONA_HORARIA = "America/Lima";

const fechaFmt = new Intl.DateTimeFormat("es-PE", {
  timeZone: ZONA_HORARIA,
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

const fechaHoraFmt = new Intl.DateTimeFormat("es-PE", {
  timeZone: ZONA_HORARIA,
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hour12: true,
});

const isoFmt = new Intl.DateTimeFormat("en-CA", {
  timeZone: ZONA_HORARIA,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/** Fecha de hoy en Lima como "YYYY-MM-DD" (valor de <input type="date">). */
export function hoyLima(): string {
  return isoFmt.format(new Date());
}

/** Date → "YYYY-MM-DD" según la hora de Lima. */
export function fechaInput(fecha: Date | string): string {
  return isoFmt.format(new Date(fecha));
}

/**
 * "YYYY-MM-DD" → Date al mediodía de Lima (evita que la fecha cambie de día por la zona horaria).
 * Si es hoy, usa la hora actual para mantener el orden de registro.
 */
export function fechaLimaADate(valor: string): Date {
  if (valor === hoyLima()) return new Date();
  return new Date(`${valor}T12:00:00-05:00`);
}

/** Rango [inicio del día "desde", inicio del día siguiente a "hasta") en hora de Lima, para filtros. */
export function rangoFechasLima(desde?: string, hasta?: string): { gte?: Date; lt?: Date } {
  const valido = (v?: string) => !!v && /^\d{4}-\d{2}-\d{2}$/.test(v);
  const rango: { gte?: Date; lt?: Date } = {};
  if (valido(desde)) rango.gte = new Date(`${desde}T00:00:00-05:00`);
  if (valido(hasta)) rango.lt = new Date(new Date(`${hasta}T00:00:00-05:00`).getTime() + 24 * 60 * 60 * 1000);
  return rango;
}

export function formatFecha(fecha: Date | string | null | undefined): string {
  if (!fecha) return "—";
  return fechaFmt.format(new Date(fecha));
}

export function formatFechaHora(fecha: Date | string | null | undefined): string {
  if (!fecha) return "—";
  return fechaHoraFmt.format(new Date(fecha));
}
