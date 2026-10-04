// Códigos de los enlaces públicos (boleta y orden). Se generan la primera vez que se comparten.
import { randomBytes } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { AppError } from "@/lib/errors";

/** Código aleatorio de 24 caracteres (144 bits): imposible de adivinar. */
export function generarToken(): string {
  return randomBytes(18).toString("base64url");
}

/** Devuelve el código público de la venta, creándolo si aún no tiene. */
export async function asegurarTokenVenta(ventaId: number): Promise<string> {
  const venta = await prisma.venta.findUnique({ where: { id: ventaId }, select: { tokenPublico: true, numero: true } });
  if (!venta || venta.numero === null) throw new AppError("La venta no existe o aún no tiene boleta.");
  if (venta.tokenPublico) return venta.tokenPublico;
  // Solo se escribe si sigue vacío: si dos usuarios comparten a la vez, ambos obtienen el mismo código
  await prisma.venta.updateMany({ where: { id: ventaId, tokenPublico: null }, data: { tokenPublico: generarToken() } });
  return (await prisma.venta.findUniqueOrThrow({ where: { id: ventaId }, select: { tokenPublico: true } })).tokenPublico!;
}

/** Devuelve el código público de la orden de servicio, creándolo si aún no tiene. */
export async function asegurarTokenOrden(ordenId: number): Promise<string> {
  const orden = await prisma.ordenServicio.findUnique({ where: { id: ordenId }, select: { tokenPublico: true } });
  if (!orden) throw new AppError("La orden de servicio no existe.");
  if (orden.tokenPublico) return orden.tokenPublico;
  await prisma.ordenServicio.updateMany({ where: { id: ordenId, tokenPublico: null }, data: { tokenPublico: generarToken() } });
  return (await prisma.ordenServicio.findUniqueOrThrow({ where: { id: ordenId }, select: { tokenPublico: true } })).tokenPublico!;
}
