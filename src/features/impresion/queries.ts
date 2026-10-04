import "server-only";
import { prisma } from "@/lib/prisma";
import { obtenerOrden } from "@/features/ordenes/queries";
import { obtenerVenta } from "@/features/ventas/queries";

/** Códigos válidos: 24 caracteres base64url (evita consultas con valores basura). */
const TOKEN = /^[A-Za-z0-9_-]{24}$/;

/** Boleta para el enlace público (sin costos ni datos internos). */
export async function ventaPublica(token: string) {
  if (!TOKEN.test(token)) return null;
  const v = await prisma.venta.findUnique({ where: { tokenPublico: token }, select: { id: true } });
  return v ? obtenerVenta(v.id, { verCosto: false }) : null;
}

/** Orden de servicio para el enlace público de consulta de estado. */
export async function ordenPublica(token: string) {
  if (!TOKEN.test(token)) return null;
  const o = await prisma.ordenServicio.findUnique({ where: { tokenPublico: token }, select: { id: true } });
  return o ? obtenerOrden(o.id) : null;
}
