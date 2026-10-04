const penFmt = new Intl.NumberFormat("es-PE", {
  style: "currency",
  currency: "PEN",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const numeroFmt = new Intl.NumberFormat("es-PE", { maximumFractionDigits: 3 });

type Numerico = string | number | { toString(): string } | null | undefined;

function aNumero(valor: Numerico): number | null {
  if (valor === null || valor === undefined || valor === "") return null;
  const n = typeof valor === "number" ? valor : Number(valor.toString());
  return Number.isFinite(n) ? n : null;
}

/** "S/ 1,234.50" */
export function formatPEN(valor: Numerico): string {
  const n = aNumero(valor);
  return n === null ? "—" : penFmt.format(n);
}

/** Número legible sin ceros sobrantes: 40, 0.5, 1,234.125 */
export function formatNumero(valor: Numerico): string {
  const n = aNumero(valor);
  return n === null ? "—" : numeroFmt.format(n);
}

/** "12.50" → 1250. Para cálculos en pantalla sin errores de coma flotante. Inválido → 0. */
export function aCentimos(valor: string | number | null | undefined): number {
  const n = Number(valor);
  return Number.isFinite(n) ? Math.round(n * 100) : 0;
}

/** 1250 → "12.50" */
export function deCentimos(centimos: number): string {
  return (centimos / 100).toFixed(2);
}

/** Decimal de Prisma → string con N decimales (para DTOs serializables). */
export function decimalATexto(valor: Numerico, decimales = 2): string | null {
  const n = aNumero(valor);
  return n === null ? null : n.toFixed(decimales);
}
