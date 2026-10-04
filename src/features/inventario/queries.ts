import "server-only";
import type { Prisma } from "../../../generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { formatearNumero } from "@/lib/correlativo";
import { rangoFechasLima } from "@/lib/dates";
import { decimalATexto } from "@/lib/money";
import type { TipoProducto } from "@/features/productos/constants";
import type { EstadoStock, MotivoAjuste, TipoMovimiento } from "./constants";

export const PAGE_SIZE = 25;

// ─────────────────────────── Stock ───────────────────────────

export type StockDTO = {
  id: number;
  productoId: number;
  producto: string;
  presentacion: string;
  codigo: string;
  tipo: TipoProducto;
  marca: string | null;
  stock: number;
  stockMinimo: number;
  /** null si el usuario no puede ver costos */
  costoPromedio: string | null;
  valorizado: string | null;
};

type FiltrosStock = { q?: string; tipo?: TipoProducto; estado?: EstadoStock; page: number; verCosto: boolean };

function whereStock({ q, tipo, estado }: Omit<FiltrosStock, "page" | "verCosto">): Prisma.PresentacionWhereInput {
  const busqueda = q?.trim();
  return {
    activo: true,
    producto: { activo: true, ...(tipo ? { tipo } : {}) },
    ...(estado === "agotado"
      ? { stock: { lte: 0 } }
      : estado === "bajo"
        ? { stock: { lte: prisma.presentacion.fields.stockMinimo } }
        : estado === "con-stock"
          ? { stock: { gt: 0 } }
          : {}),
    ...(busqueda
      ? {
          OR: [
            { codigo: { contains: busqueda, mode: "insensitive" } },
            { codigoBarras: { equals: busqueda } },
            { nombre: { contains: busqueda, mode: "insensitive" } },
            { producto: { nombre: { contains: busqueda, mode: "insensitive" } } },
            { producto: { marca: { nombre: { contains: busqueda, mode: "insensitive" } } } },
          ],
        }
      : {}),
  };
}

export async function listarStock(f: FiltrosStock) {
  const where = whereStock(f);
  const [total, filas] = await Promise.all([
    prisma.presentacion.count({ where }),
    prisma.presentacion.findMany({
      where,
      orderBy: [{ producto: { nombre: "asc" } }, { nombre: "asc" }],
      skip: (f.page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: { producto: { select: { id: true, nombre: true, tipo: true, marca: { select: { nombre: true } } } } },
    }),
  ]);

  const items: StockDTO[] = filas.map((p) => ({
    id: p.id,
    productoId: p.producto.id,
    producto: p.producto.nombre,
    presentacion: p.nombre,
    codigo: p.codigo,
    tipo: p.producto.tipo,
    marca: p.producto.marca?.nombre ?? null,
    stock: p.stock,
    stockMinimo: p.stockMinimo,
    costoPromedio: f.verCosto ? decimalATexto(p.costoPromedio) : null,
    valorizado: f.verCosto ? decimalATexto(p.costoPromedio.mul(p.stock)) : null,
  }));
  return { items, total, page: f.page, pageSize: PAGE_SIZE };
}

export async function resumenStock(verCosto: boolean) {
  const base: Prisma.PresentacionWhereInput = { activo: true, producto: { activo: true } };
  const [items, bajo, agotado, valor] = await Promise.all([
    prisma.presentacion.count({ where: base }),
    prisma.presentacion.count({ where: { ...base, stock: { lte: prisma.presentacion.fields.stockMinimo } } }),
    prisma.presentacion.count({ where: { ...base, stock: { lte: 0 } } }),
    verCosto
      ? prisma.$queryRaw<{ valor: Prisma.Decimal | null; unidades: bigint | null }[]>`
          SELECT SUM(pr.stock * pr."costoPromedio") AS valor, SUM(pr.stock) AS unidades
          FROM "presentacion" pr JOIN "producto" p ON p.id = pr."productoId"
          WHERE pr.activo AND p.activo`
      : Promise.resolve(null),
  ]);
  return {
    items,
    bajo,
    agotado,
    valor: valor ? (decimalATexto(valor[0]?.valor ?? 0) ?? "0.00") : null,
    unidades: valor ? Number(valor[0]?.unidades ?? 0) : null,
  };
}

// ─────────────────────────── Kardex ───────────────────────────

export type MovimientoDTO = {
  id: number;
  fecha: string;
  presentacionId: number;
  producto: string;
  presentacion: string;
  codigo: string;
  tipo: TipoMovimiento;
  cantidad: number;
  stockAnterior: number;
  stockNuevo: number;
  costoUnitario: string | null;
  usuario: string;
  nota: string | null;
  referencia: { texto: string; href: string | null } | null;
};

type FiltrosKardex = {
  q?: string;
  presentacionId?: number;
  tipo?: TipoMovimiento;
  desde?: string;
  hasta?: string;
  page: number;
  verCosto: boolean;
};

export async function listarKardex(f: FiltrosKardex) {
  const busqueda = f.q?.trim();
  const rango = rangoFechasLima(f.desde, f.hasta);
  const where: Prisma.MovimientoInventarioWhereInput = {
    ...(f.presentacionId ? { presentacionId: f.presentacionId } : {}),
    ...(f.tipo ? { tipo: f.tipo } : {}),
    ...(rango.gte || rango.lt ? { fecha: rango } : {}),
    ...(busqueda
      ? {
          presentacion: {
            OR: [
              { codigo: { contains: busqueda, mode: "insensitive" } },
              { producto: { nombre: { contains: busqueda, mode: "insensitive" } } },
            ],
          },
        }
      : {}),
  };

  const [total, filas] = await Promise.all([
    prisma.movimientoInventario.count({ where }),
    prisma.movimientoInventario.findMany({
      where,
      orderBy: [{ fecha: "desc" }, { id: "desc" }],
      skip: (f.page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: {
        usuario: { select: { name: true } },
        compra: { select: { id: true, serie: true, numero: true } },
        venta: { select: { id: true, serie: true, numero: true } },
        presentacion: { select: { nombre: true, codigo: true, producto: { select: { nombre: true } } } },
      },
    }),
  ]);

  const items: MovimientoDTO[] = filas.map((m) => ({
    id: m.id,
    fecha: m.fecha.toISOString(),
    presentacionId: m.presentacionId,
    producto: m.presentacion.producto.nombre,
    presentacion: m.presentacion.nombre,
    codigo: m.presentacion.codigo,
    tipo: m.tipo,
    cantidad: m.cantidad,
    stockAnterior: m.stockAnterior,
    stockNuevo: m.stockNuevo,
    costoUnitario: f.verCosto ? decimalATexto(m.costoUnitario) : null,
    usuario: m.usuario.name,
    nota: m.nota,
    referencia: m.compra
      ? { texto: formatearNumero(m.compra.serie, m.compra.numero), href: `/compras/${m.compra.id}` }
      : m.venta
        ? { texto: m.venta.serie && m.venta.numero ? formatearNumero(m.venta.serie, m.venta.numero) : `Venta #${m.venta.id}`, href: null }
        : m.ajusteId
          ? { texto: `Ajuste #${m.ajusteId}`, href: `/inventario/ajustes/${m.ajusteId}` }
          : null,
  }));
  return { items, total, page: f.page, pageSize: PAGE_SIZE };
}

export async function nombrePresentacion(id: number) {
  const p = await prisma.presentacion.findUnique({
    where: { id },
    select: { nombre: true, codigo: true, stock: true, producto: { select: { id: true, nombre: true } } },
  });
  return p ? { productoId: p.producto.id, label: `${p.producto.nombre} — ${p.nombre} (${p.codigo})`, stock: p.stock } : null;
}

// ─────────────────────────── Ajustes ───────────────────────────

export type AjusteListaDTO = {
  id: number;
  fecha: string;
  motivo: MotivoAjuste;
  observacion: string | null;
  usuario: string;
  productos: number;
  entradas: number;
  salidas: number;
};

export async function listarAjustes({ motivo, page }: { motivo?: MotivoAjuste; page: number }) {
  const where: Prisma.AjusteInventarioWhereInput = motivo ? { motivo } : {};
  const [total, filas] = await Promise.all([
    prisma.ajusteInventario.count({ where }),
    prisma.ajusteInventario.findMany({
      where,
      orderBy: [{ fecha: "desc" }, { id: "desc" }],
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: { usuario: { select: { name: true } }, movimientos: { select: { cantidad: true } } },
    }),
  ]);
  const items: AjusteListaDTO[] = filas.map((a) => ({
    id: a.id,
    fecha: a.fecha.toISOString(),
    motivo: a.motivo,
    observacion: a.observacion,
    usuario: a.usuario.name,
    productos: a.movimientos.length,
    entradas: a.movimientos.filter((m) => m.cantidad > 0).reduce((s, m) => s + m.cantidad, 0),
    salidas: a.movimientos.filter((m) => m.cantidad < 0).reduce((s, m) => s - m.cantidad, 0),
  }));
  return { items, total, page, pageSize: PAGE_SIZE };
}

export async function obtenerAjuste(id: number, verCosto: boolean) {
  const a = await prisma.ajusteInventario.findUnique({
    where: { id },
    include: {
      usuario: { select: { name: true } },
      movimientos: {
        orderBy: { id: "asc" },
        include: { presentacion: { select: { nombre: true, codigo: true, producto: { select: { id: true, nombre: true } } } } },
      },
    },
  });
  if (!a) return null;
  return {
    id: a.id,
    fecha: a.fecha.toISOString(),
    motivo: a.motivo,
    observacion: a.observacion,
    usuario: a.usuario.name,
    movimientos: a.movimientos.map((m) => ({
      id: m.id,
      productoId: m.presentacion.producto.id,
      producto: m.presentacion.producto.nombre,
      presentacion: m.presentacion.nombre,
      codigo: m.presentacion.codigo,
      cantidad: m.cantidad,
      stockAnterior: m.stockAnterior,
      stockNuevo: m.stockNuevo,
      costoUnitario: verCosto ? decimalATexto(m.costoUnitario) : null,
      nota: m.nota,
    })),
  };
}

export type PresentacionAjusteOpcion = {
  id: number;
  label: string;
  codigo: string;
  stock: number;
  costoPromedio: string;
};

export async function presentacionesParaAjuste(): Promise<PresentacionAjusteOpcion[]> {
  const filas = await prisma.presentacion.findMany({
    where: { activo: true, producto: { activo: true } },
    orderBy: [{ producto: { nombre: "asc" } }, { nombre: "asc" }],
    select: { id: true, nombre: true, codigo: true, stock: true, costoPromedio: true, producto: { select: { nombre: true } } },
  });
  return filas.map((p) => ({
    id: p.id,
    label: `${p.producto.nombre} — ${p.nombre} (${p.codigo})`,
    codigo: p.codigo,
    stock: p.stock,
    costoPromedio: decimalATexto(p.costoPromedio) ?? "0.00",
  }));
}
