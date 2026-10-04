import "server-only";
import { prisma } from "@/lib/prisma";
import { decimalATexto } from "@/lib/money";
import type { CatalogoSimple } from "./schemas";

export type CatalogoSimpleDTO = { id: number; nombre: string; activo: boolean; enUso: number };

export async function listarCatalogoSimple(entidad: CatalogoSimple): Promise<CatalogoSimpleDTO[]> {
  const args = {
    orderBy: [{ activo: "desc" as const }, { nombre: "asc" as const }],
    select: { id: true, nombre: true, activo: true, _count: { select: { productos: true } } },
  };
  const filas =
    entidad === "marca"
      ? await prisma.marca.findMany(args)
      : entidad === "uso"
        ? await prisma.usoBalanza.findMany(args)
        : await prisma.formaBalanza.findMany(args);
  return filas.map((f) => ({ id: f.id, nombre: f.nombre, activo: f.activo, enUso: f._count.productos }));
}

export type ServicioDTO = {
  id: number;
  nombre: string;
  descripcion: string | null;
  precioReferencial: string;
  activo: boolean;
  enUso: number;
};

export async function listarServicios(): Promise<ServicioDTO[]> {
  const filas = await prisma.servicio.findMany({
    orderBy: [{ activo: "desc" }, { nombre: "asc" }],
    include: { _count: { select: { ventaDetalles: true } } },
  });
  return filas.map((s) => ({
    id: s.id,
    nombre: s.nombre,
    descripcion: s.descripcion,
    precioReferencial: decimalATexto(s.precioReferencial) ?? "0.00",
    activo: s.activo,
    enUso: s._count.ventaDetalles,
  }));
}

export type MetodoPagoDTO = {
  id: number;
  nombre: string;
  esEfectivo: boolean;
  requiereReferencia: boolean;
  orden: number;
  activo: boolean;
  enUso: number;
};

export async function listarMetodosPago(): Promise<MetodoPagoDTO[]> {
  const filas = await prisma.metodoPago.findMany({
    orderBy: [{ activo: "desc" }, { orden: "asc" }, { nombre: "asc" }],
    include: { _count: { select: { pagos: true, pagosCompra: true } } },
  });
  return filas.map((m) => ({
    id: m.id,
    nombre: m.nombre,
    esEfectivo: m.esEfectivo,
    requiereReferencia: m.requiereReferencia,
    orden: m.orden,
    activo: m.activo,
    enUso: m._count.pagos + m._count.pagosCompra,
  }));
}
