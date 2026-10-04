import { hoyLima, rangoFechasLima } from "@/lib/dates";

export type Periodo = { desde: string; hasta: string; gte: Date; lt: Date; dias: number };

const FECHA = /^\d{4}-\d{2}-\d{2}$/;

/** Suma días a "YYYY-MM-DD" (sin zona horaria: solo calendario). */
export function sumarDias(fecha: string, dias: number): string {
  const d = new Date(`${fecha}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + dias);
  return d.toISOString().slice(0, 10);
}

/**
 * Periodo de un reporte a partir de ?desde=&hasta=. Por defecto, el mes en curso.
 * Si vienen invertidas se ordenan.
 */
export function periodoDe(desde?: string, hasta?: string): Periodo {
  const hoy = hoyLima();
  let d = desde && FECHA.test(desde) ? desde : `${hoy.slice(0, 8)}01`;
  let h = hasta && FECHA.test(hasta) ? hasta : hoy;
  if (d > h) [d, h] = [h, d];
  const rango = rangoFechasLima(d, h);
  const dias = Math.round((rango.lt!.getTime() - rango.gte!.getTime()) / 86_400_000);
  return { desde: d, hasta: h, gte: rango.gte!, lt: rango.lt!, dias };
}

/** Todos los días (o meses "YYYY-MM") del periodo, para que el gráfico no tenga huecos. */
export function serieCalendario(p: Periodo, agrupacion: "dia" | "mes"): string[] {
  const claves: string[] = [];
  if (agrupacion === "dia") {
    for (let f = p.desde; f <= p.hasta; f = sumarDias(f, 1)) claves.push(f);
  } else {
    for (let m = p.desde.slice(0, 7); m <= p.hasta.slice(0, 7); ) {
      claves.push(m);
      const [a, mes] = m.split("-").map(Number) as [number, number];
      m = mes === 12 ? `${a + 1}-01` : `${a}-${String(mes + 1).padStart(2, "0")}`;
    }
  }
  return claves;
}

/** Hasta ~2 meses se agrupa por día; más largo, por mes. */
export const agrupacionDe = (p: Periodo): "dia" | "mes" => (p.dias <= 62 ? "dia" : "mes");
