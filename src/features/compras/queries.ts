import "server-only";
import type { Prisma } from "../../../generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { formatearNumero } from "@/lib/correlativo";
import { decimalATexto } from "@/lib/money";
import type { EstadoPago } from "@/lib/estados";
import type { Opcion } from "@/components/form/select-field";
import type { EstadoCompra, TipoEmpaque } from "./constants";
import type { ESTADOS_FILTRO_COMPRA, PAGOS_FILTRO_COMPRA } from "./schemas";

export const PAGE_SIZE = 20;

export type CompraListaDTO = {
  id: number;
  numero: string;
  proveedor: string;
  fechaPedido: string;
  fechaRecepcion: string | null;
  documentoProveedor: string | null;
  estado: EstadoCompra;
  estadoPago: EstadoPago;
  total: string;
  montoPagado: string;
  saldo: string;
  items: number;
};

type Filtros = {
  q?: string;
  estado?: (typeof ESTADOS_FILTRO_COMPRA)[number];
  pago?: (typeof PAGOS_FILTRO_COMPRA)[number];
  proveedorId?: number;
  page: number;
};

export async function listarCompras({ q, estado, pago, proveedorId, page }: Filtros) {
  const busqueda = q?.trim();
  const numero = busqueda?.match(/(\d+)\s*$/)?.[1];
  const where: Prisma.CompraWhereInput = {
    ...(estado ? { estado } : {}),
    ...(proveedorId ? { proveedorId } : {}),
    ...(pago === "DEUDA"
      ? { estado: { not: "ANULADA" }, estadoPago: { not: "PAGADO" } }
      : pago
        ? { estadoPago: pago }
        : {}),
    ...(busqueda
      ? {
          OR: [
            { proveedor: { razonSocial: { contains: busqueda, mode: "insensitive" } } },
            { documentoProveedor: { contains: busqueda, mode: "insensitive" } },
            ...(numero ? [{ numero: Number(numero) }] : []),
          ],
        }
      : {}),
  };

  const [total, filas] = await Promise.all([
    prisma.compra.count({ where }),
    prisma.compra.findMany({
      where,
      orderBy: [{ fechaPedido: "desc" }, { id: "desc" }],
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: { proveedor: { select: { razonSocial: true } }, _count: { select: { detalles: true } } },
    }),
  ]);

  const items: CompraListaDTO[] = filas.map((c) => ({
    id: c.id,
    numero: formatearNumero(c.serie, c.numero),
    proveedor: c.proveedor.razonSocial,
    fechaPedido: c.fechaPedido.toISOString(),
    fechaRecepcion: c.fechaRecepcion?.toISOString() ?? null,
    documentoProveedor: c.documentoProveedor,
    estado: c.estado,
    estadoPago: c.estadoPago,
    total: decimalATexto(c.total) ?? "0.00",
    montoPagado: decimalATexto(c.montoPagado) ?? "0.00",
    saldo: decimalATexto(c.total.sub(c.montoPagado)) ?? "0.00",
    items: c._count.detalles,
  }));

  return { items, total, page, pageSize: PAGE_SIZE };
}

/** Deuda total con proveedores (compras no anuladas con saldo). */
export async function deudaProveedores(): Promise<string> {
  const r = await prisma.compra.aggregate({
    where: { estado: { not: "ANULADA" }, estadoPago: { not: "PAGADO" } },
    _sum: { total: true, montoPagado: true },
  });
  const total = Number(r._sum.total ?? 0) - Number(r._sum.montoPagado ?? 0);
  return total.toFixed(2);
}

export type DetalleCompraDTO = {
  id: number;
  presentacionId: number;
  producto: string;
  presentacion: string;
  codigo: string;
  empaque: TipoEmpaque;
  unidadesPorEmpaque: number;
  cantidadEmpaques: number;
  cantidadUnidades: number;
  cantidadRecibida: number | null;
  costoEmpaque: string;
  costoUnitario: string;
  subtotal: string;
};

export type PagoCompraDTO = {
  id: number;
  metodo: string;
  monto: string;
  referencia: string | null;
  fecha: string;
  usuario: string;
  anulado: boolean;
  motivoAnulacion: string | null;
};

export type CompraDetalleDTO = Omit<CompraListaDTO, "items"> & {
  proveedorId: number;
  observaciones: string | null;
  creadoPor: string;
  recibidoPor: string | null;
  anuladoPor: string | null;
  fechaAnulacion: string | null;
  motivoAnulacion: string | null;
  createdAt: string;
  detalles: DetalleCompraDTO[];
  pagos: PagoCompraDTO[];
};

export async function obtenerCompra(id: number): Promise<CompraDetalleDTO | null> {
  const c = await prisma.compra.findUnique({
    where: { id },
    include: {
      proveedor: { select: { razonSocial: true } },
      creadoPor: { select: { name: true } },
      recibidoPor: { select: { name: true } },
      anuladoPor: { select: { name: true } },
      detalles: {
        orderBy: { id: "asc" },
        include: { presentacion: { select: { nombre: true, codigo: true, producto: { select: { nombre: true } } } } },
      },
      pagos: {
        orderBy: { fecha: "asc" },
        include: { metodoPago: { select: { nombre: true } }, usuario: { select: { name: true } } },
      },
    },
  });
  if (!c) return null;

  return {
    id: c.id,
    numero: formatearNumero(c.serie, c.numero),
    proveedorId: c.proveedorId,
    proveedor: c.proveedor.razonSocial,
    fechaPedido: c.fechaPedido.toISOString(),
    fechaRecepcion: c.fechaRecepcion?.toISOString() ?? null,
    documentoProveedor: c.documentoProveedor,
    observaciones: c.observaciones,
    estado: c.estado,
    estadoPago: c.estadoPago,
    total: decimalATexto(c.total) ?? "0.00",
    montoPagado: decimalATexto(c.montoPagado) ?? "0.00",
    saldo: decimalATexto(c.total.sub(c.montoPagado)) ?? "0.00",
    creadoPor: c.creadoPor.name,
    recibidoPor: c.recibidoPor?.name ?? null,
    anuladoPor: c.anuladoPor?.name ?? null,
    fechaAnulacion: c.fechaAnulacion?.toISOString() ?? null,
    motivoAnulacion: c.motivoAnulacion,
    createdAt: c.createdAt.toISOString(),
    detalles: c.detalles.map((d) => ({
      id: d.id,
      presentacionId: d.presentacionId,
      producto: d.presentacion.producto.nombre,
      presentacion: d.presentacion.nombre,
      codigo: d.presentacion.codigo,
      empaque: d.empaque,
      unidadesPorEmpaque: d.unidadesPorEmpaque,
      cantidadEmpaques: d.cantidadEmpaques,
      cantidadUnidades: d.cantidadUnidades,
      cantidadRecibida: d.cantidadRecibida,
      costoEmpaque: decimalATexto(d.costoEmpaque) ?? "0.00",
      costoUnitario: decimalATexto(d.costoUnitario, 4) ?? "0.0000",
      subtotal: decimalATexto(d.subtotal) ?? "0.00",
    })),
    pagos: c.pagos.map((p) => ({
      id: p.id,
      metodo: p.metodoPago.nombre,
      monto: decimalATexto(p.monto) ?? "0.00",
      referencia: p.referencia,
      fecha: p.fecha.toISOString(),
      usuario: p.usuario.name,
      anulado: p.anulado,
      motivoAnulacion: p.motivoAnulacion,
    })),
  };
}

export type PresentacionCompraOpcion = {
  id: number;
  label: string;
  producto: string;
  presentacion: string;
  codigo: string;
  unidadesPorCaja: number | null;
  ultimoCosto: string | null;
  stock: number;
};

/** Datos para el formulario: proveedores y presentaciones activas. */
export async function opcionesCompra(incluirProveedorId?: number) {
  const [proveedores, presentaciones] = await Promise.all([
    prisma.proveedor.findMany({
      where: { OR: [{ activo: true }, ...(incluirProveedorId ? [{ id: incluirProveedorId }] : [])] },
      orderBy: { razonSocial: "asc" },
      select: { id: true, razonSocial: true },
    }),
    prisma.presentacion.findMany({
      where: { activo: true, producto: { activo: true } },
      orderBy: [{ producto: { nombre: "asc" } }, { nombre: "asc" }],
      select: {
        id: true,
        nombre: true,
        codigo: true,
        unidadesPorCaja: true,
        ultimoCosto: true,
        stock: true,
        producto: { select: { nombre: true } },
      },
    }),
  ]);

  return {
    proveedores: proveedores.map((p): Opcion => ({ value: String(p.id), label: p.razonSocial })),
    presentaciones: presentaciones.map(
      (p): PresentacionCompraOpcion => ({
        id: p.id,
        label: `${p.producto.nombre} — ${p.nombre} (${p.codigo})`,
        producto: p.producto.nombre,
        presentacion: p.nombre,
        codigo: p.codigo,
        unidadesPorCaja: p.unidadesPorCaja,
        ultimoCosto: Number(p.ultimoCosto) > 0 ? decimalATexto(p.ultimoCosto) : null,
        stock: p.stock,
      }),
    ),
  };
}

export async function metodosPagoActivos() {
  const metodos = await prisma.metodoPago.findMany({
    where: { activo: true },
    orderBy: [{ orden: "asc" }, { nombre: "asc" }],
    select: { id: true, nombre: true, requiereReferencia: true },
  });
  return metodos;
}

export type MetodoPagoOpcion = Awaited<ReturnType<typeof metodosPagoActivos>>[number];

export async function opcionesProveedoresFiltro(): Promise<Opcion[]> {
  const proveedores = await prisma.proveedor.findMany({
    orderBy: { razonSocial: "asc" },
    select: { id: true, razonSocial: true },
  });
  return proveedores.map((p) => ({ value: String(p.id), label: p.razonSocial }));
}
