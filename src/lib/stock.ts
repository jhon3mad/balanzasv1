// Operaciones de stock compartidas (compras, ajustes y ventas). Usar dentro de una transacción.
import { Prisma } from "../../generated/prisma/client";
import { AppError } from "@/lib/errors";

/**
 * Bloquea la presentación (SELECT … FOR UPDATE) y devuelve su stock y costo promedio.
 * Así dos operaciones simultáneas no pueden leer el mismo stock y pisarse.
 */
export async function bloquearPresentacion(tx: Prisma.TransactionClient, presentacionId: number) {
  const filas = await tx.$queryRaw<{ stock: number; costoPromedio: Prisma.Decimal; ultimoCosto: Prisma.Decimal; nombre: string }[]>`
    SELECT pr.stock, pr."costoPromedio", pr."ultimoCosto", p.nombre || ' - ' || pr.nombre AS nombre
    FROM "presentacion" pr JOIN "producto" p ON p.id = pr."productoId"
    WHERE pr.id = ${presentacionId}
    FOR UPDATE OF pr`;
  const fila = filas[0];
  if (!fila) throw new AppError("Uno de los productos ya no existe.");
  return {
    stock: fila.stock,
    costoPromedio: new Prisma.Decimal(fila.costoPromedio.toString()),
    ultimoCosto: new Prisma.Decimal(fila.ultimoCosto.toString()),
    nombre: fila.nombre,
  };
}

/** Costo promedio ponderado tras una entrada: (stock × promedio + cantidad × costo) / (stock + cantidad). */
export function nuevoCostoPromedio(
  stock: number,
  promedio: Prisma.Decimal,
  cantidad: number,
  costo: Prisma.Decimal,
): Prisma.Decimal {
  const base = Math.max(stock, 0);
  if (base + cantidad <= 0) return costo.toDecimalPlaces(4);
  return promedio.mul(base).add(costo.mul(cantidad)).div(base + cantidad).toDecimalPlaces(4);
}
