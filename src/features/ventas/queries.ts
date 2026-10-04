import "server-only";
import type { Prisma } from "../../../generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { formatearNumero } from "@/lib/correlativo";
import { hoyLima, rangoFechasLima } from "@/lib/dates";
import type { EstadoPago } from "@/lib/estados";
import { decimalATexto } from "@/lib/money";
import type { Opcion } from "@/components/form/select-field";
import { documentoCliente } from "@/features/clientes/schemas";
import { TRAMOS_ANTIGUEDAD, type EstadoEntrega, type EstadoVenta, type TramoAntiguedad } from "./constants";
import type { ENTREGAS_FILTRO_VENTA, ESTADOS_FILTRO_VENTA, PAGOS_FILTRO_VENTA } from "./schemas";

export const PAGE_SIZE = 20;

const texto = (v: Prisma.Decimal | null | undefined) => decimalATexto(v ?? 0) ?? "0.00";
const numeroDe = (v: { id: number; serie: string | null; numero: number | null }) =>
  v.serie && v.numero ? formatearNumero(v.serie, v.numero) : `#${v.id}`;

export type ProductoVentaOpcion = {
  id: number;
  label: string;
  codigo: string;
  codigoBarras: string | null;
  precioVenta: string;
  precioMinimo: string;
  stock: number;
};

export type ClienteVentaOpcion = { id: number; nombre: string; documento: string | null; telefono: string | null };

export type MetodoPagoVenta = { id: number; nombre: string; esEfectivo: boolean; requiereReferencia: boolean };

/** Clientes activos para el selector de cliente. */
export async function opcionesClientesVenta(): Promise<ClienteVentaOpcion[]> {
  const clientes = await prisma.cliente.findMany({
    where: { activo: true },
    orderBy: { nombre: "asc" },
    select: { id: true, nombre: true, tipoDocumento: true, numeroDocumento: true, telefono: true },
  });
  return clientes.map((c) => ({
    id: c.id,
    nombre: c.nombre,
    documento: documentoCliente(c.tipoDocumento, c.numeroDocumento),
    telefono: c.telefono,
  }));
}

export async function metodosPagoVenta(): Promise<MetodoPagoVenta[]> {
  return prisma.metodoPago.findMany({
    where: { activo: true },
    orderBy: [{ orden: "asc" }, { nombre: "asc" }],
    select: { id: true, nombre: true, esEfectivo: true, requiereReferencia: true },
  });
}

/** Presentaciones activas con precio y stock (punto de venta y repuestos de órdenes). */
export async function opcionesProductosVenta(): Promise<ProductoVentaOpcion[]> {
  const presentaciones = await prisma.presentacion.findMany({
    where: { activo: true, producto: { activo: true } },
    orderBy: [{ producto: { nombre: "asc" } }, { nombre: "asc" }],
    select: {
      id: true,
      nombre: true,
      codigo: true,
      codigoBarras: true,
      precioVenta: true,
      precioMinimo: true,
      stock: true,
      producto: { select: { nombre: true } },
    },
  });
  return presentaciones.map((p) => ({
    id: p.id,
    label: p.nombre === "Estándar" ? `${p.producto.nombre} (${p.codigo})` : `${p.producto.nombre} — ${p.nombre} (${p.codigo})`,
    codigo: p.codigo,
    codigoBarras: p.codigoBarras,
    precioVenta: decimalATexto(p.precioVenta) ?? "0.00",
    precioMinimo: decimalATexto(p.precioMinimo) ?? "0.00",
    stock: p.stock,
  }));
}

/** Datos que necesita el punto de venta. */
export async function datosPuntoVenta() {
  const [productos, clientes, metodos] = await Promise.all([
    opcionesProductosVenta(),
    opcionesClientesVenta(),
    metodosPagoVenta(),
  ]);

  return {
    productos,
    clientes,
    metodos,
  };
}

// ─────────────────────────────────────────────────────────────
// Listado
// ─────────────────────────────────────────────────────────────

export type VentaListaDTO = {
  id: number;
  numero: string;
  fechaEmision: string | null;
  cliente: string | null;
  vendedor: string;
  estado: EstadoVenta;
  estadoPago: EstadoPago;
  estadoEntrega: EstadoEntrega;
  total: string;
  saldo: string;
};

export type FiltrosVentas = {
  q?: string;
  desde?: string;
  hasta?: string;
  vendedorId?: string;
  clienteId?: number;
  estado?: (typeof ESTADOS_FILTRO_VENTA)[number];
  pago?: (typeof PAGOS_FILTRO_VENTA)[number];
  entrega?: (typeof ENTREGAS_FILTRO_VENTA)[number];
  page: number;
};

function whereVentas(f: Omit<FiltrosVentas, "page">): Prisma.VentaWhereInput {
  const busqueda = f.q?.trim();
  const numero = busqueda?.match(/(\d+)\s*$/)?.[1];
  const rango = rangoFechasLima(f.desde, f.hasta);
  return {
    // Solo lo que tiene boleta: las órdenes de servicio abiertas o canceladas aún no son ventas
    numero: { not: null },
    estado: f.estado ?? { not: "ABIERTA" },
    ...(rango.gte || rango.lt ? { fechaEmision: rango } : {}),
    ...(f.vendedorId ? { vendedorId: f.vendedorId } : {}),
    ...(f.clienteId ? { clienteId: f.clienteId } : {}),
    ...(f.pago === "DEUDA" ? { saldo: { gt: 0 } } : f.pago ? { estadoPago: f.pago } : {}),
    // Con saldo o por entregar solo tiene sentido en ventas vigentes
    ...((f.pago === "DEUDA" || f.entrega === "PENDIENTE") && !f.estado ? { estado: "EMITIDA" } : {}),
    ...(f.entrega ? { estadoEntrega: f.entrega } : {}),
    ...(busqueda
      ? {
          OR: [
            { cliente: { nombre: { contains: busqueda, mode: "insensitive" } } },
            { cliente: { numeroDocumento: { contains: busqueda.toUpperCase() } } },
            ...(numero && numero.length <= 9 ? [{ numero: Number(numero) }] : []),
          ],
        }
      : {}),
  };
}

export async function listarVentas({ page, ...filtros }: FiltrosVentas) {
  const where = whereVentas(filtros);
  const [total, filas, resumen] = await Promise.all([
    prisma.venta.count({ where }),
    prisma.venta.findMany({
      where,
      orderBy: [{ fechaEmision: "desc" }, { id: "desc" }],
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: { cliente: { select: { nombre: true } }, vendedor: { select: { name: true } } },
    }),
    // Totales del filtro sin contar anuladas
    prisma.venta.aggregate({
      where: { AND: [where, { estado: "EMITIDA" }] },
      _count: true,
      _sum: { total: true, montoPagado: true, saldo: true },
    }),
  ]);

  const items: VentaListaDTO[] = filas.map((v) => ({
    id: v.id,
    numero: numeroDe(v),
    fechaEmision: v.fechaEmision?.toISOString() ?? null,
    cliente: v.cliente?.nombre ?? null,
    vendedor: v.vendedor.name,
    estado: v.estado,
    estadoPago: v.estadoPago,
    estadoEntrega: v.estadoEntrega,
    total: texto(v.total),
    saldo: texto(v.saldo),
  }));

  return {
    items,
    total,
    page,
    pageSize: PAGE_SIZE,
    resumen: {
      ventas: resumen._count,
      total: texto(resumen._sum.total),
      cobrado: texto(resumen._sum.montoPagado),
      saldo: texto(resumen._sum.saldo),
    },
  };
}

/** Ventas emitidas hoy (Lima), opcionalmente de un vendedor. */
export async function resumenVentasHoy(vendedorId?: string) {
  const hoy = hoyLima();
  const r = await prisma.venta.aggregate({
    where: { estado: "EMITIDA", fechaEmision: rangoFechasLima(hoy, hoy), ...(vendedorId ? { vendedorId } : {}) },
    _count: true,
    _sum: { total: true },
  });
  return { hoy, ventas: r._count, total: texto(r._sum.total) };
}

/** Usuarios que pueden vender o que ya vendieron (para el filtro). */
export async function opcionesVendedores(): Promise<Opcion[]> {
  const usuarios = await prisma.user.findMany({
    where: { OR: [{ role: { in: ["admin", "vendedor"] } }, { ventas: { some: {} } }] },
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });
  return usuarios.map((u) => ({ value: u.id, label: u.name }));
}

export async function nombreCliente(id: number): Promise<string | null> {
  const c = await prisma.cliente.findUnique({ where: { id }, select: { nombre: true } });
  return c?.nombre ?? null;
}

// ─────────────────────────────────────────────────────────────
// Detalle
// ─────────────────────────────────────────────────────────────

export type LineaVentaDTO = {
  id: number;
  tipoItem: "PRODUCTO" | "SERVICIO";
  descripcion: string;
  codigo: string | null;
  cantidad: number;
  precioLista: string;
  precioUnitario: string;
  subtotal: string;
  /** Solo se llena para quien puede ver la utilidad */
  costoUnitario: string | null;
};

export type PagoVentaDTO = {
  id: number;
  metodo: string;
  monto: string;
  montoRecibido: string | null;
  referencia: string | null;
  fecha: string;
  usuario: string;
  anulado: boolean;
  anuladoPor: string | null;
  fechaAnulacion: string | null;
  motivoAnulacion: string | null;
};

/** Include de Prisma para leer pagos con sus nombres (ventas y órdenes de servicio). */
export const INCLUDE_PAGOS = {
  orderBy: [{ fecha: "asc" }, { id: "asc" }],
  include: {
    metodoPago: { select: { nombre: true } },
    usuario: { select: { name: true } },
    anuladoPor: { select: { name: true } },
  },
} satisfies Prisma.Venta$pagosArgs;

type PagoConNombres = Prisma.PagoGetPayload<{ include: (typeof INCLUDE_PAGOS)["include"] }>;

export function pagoADTO(p: PagoConNombres): PagoVentaDTO {
  return {
    id: p.id,
    metodo: p.metodoPago.nombre,
    monto: texto(p.monto),
    montoRecibido: p.montoRecibido ? texto(p.montoRecibido) : null,
    referencia: p.referencia,
    fecha: p.fecha.toISOString(),
    usuario: p.usuario.name,
    anulado: p.anulado,
    anuladoPor: p.anuladoPor?.name ?? null,
    fechaAnulacion: p.fechaAnulacion?.toISOString() ?? null,
    motivoAnulacion: p.motivoAnulacion,
  };
}

type LineaConCodigo = Prisma.VentaDetalleGetPayload<{ include: { presentacion: { select: { codigo: true } } } }>;

export function lineaADTO(d: LineaConCodigo, verCosto: boolean): LineaVentaDTO {
  return {
    id: d.id,
    tipoItem: d.tipoItem,
    descripcion: d.descripcion,
    codigo: d.presentacion?.codigo ?? null,
    cantidad: d.cantidad,
    precioLista: texto(d.precioLista),
    precioUnitario: texto(d.precioUnitario),
    subtotal: texto(d.subtotal),
    costoUnitario: verCosto ? decimalATexto(d.costoUnitario, 4) : null,
  };
}

export type VentaDetalleDTO = VentaListaDTO & {
  tipo: "VENTA" | "SERVICIO";
  /** Orden de servicio de la que salió la boleta */
  orden: { id: number; numero: string } | null;
  clienteId: number | null;
  clienteDocumento: string | null;
  clienteTelefono: string | null;
  totalLista: string;
  descuento: string;
  montoPagado: string;
  fechaEntrega: string | null;
  entregadoPor: string | null;
  observaciones: string | null;
  anuladoPor: string | null;
  fechaAnulacion: string | null;
  motivoAnulacion: string | null;
  lineas: LineaVentaDTO[];
  pagos: PagoVentaDTO[];
};

export async function obtenerVenta(id: number, { verCosto }: { verCosto: boolean }): Promise<VentaDetalleDTO | null> {
  const v = await prisma.venta.findUnique({
    where: { id },
    include: {
      cliente: { select: { nombre: true, tipoDocumento: true, numeroDocumento: true, telefono: true } },
      vendedor: { select: { name: true } },
      entregadoPor: { select: { name: true } },
      anuladoPor: { select: { name: true } },
      detalles: { orderBy: { id: "asc" }, include: { presentacion: { select: { codigo: true } } } },
      pagos: INCLUDE_PAGOS,
      ordenServicio: { select: { id: true, serie: true, numero: true } },
    },
  });
  if (!v || v.estado === "ABIERTA" || v.numero === null) return null;

  return {
    id: v.id,
    tipo: v.tipo,
    orden: v.ordenServicio
      ? { id: v.ordenServicio.id, numero: formatearNumero(v.ordenServicio.serie, v.ordenServicio.numero) }
      : null,
    numero: numeroDe(v),
    fechaEmision: v.fechaEmision?.toISOString() ?? null,
    clienteId: v.clienteId,
    cliente: v.cliente?.nombre ?? null,
    clienteDocumento: v.cliente ? documentoCliente(v.cliente.tipoDocumento, v.cliente.numeroDocumento) : null,
    clienteTelefono: v.cliente?.telefono ?? null,
    vendedor: v.vendedor.name,
    estado: v.estado,
    estadoPago: v.estadoPago,
    estadoEntrega: v.estadoEntrega,
    totalLista: texto(v.totalLista),
    descuento: texto(v.descuento),
    total: texto(v.total),
    montoPagado: texto(v.montoPagado),
    saldo: texto(v.saldo),
    fechaEntrega: v.fechaEntrega?.toISOString() ?? null,
    entregadoPor: v.entregadoPor?.name ?? null,
    observaciones: v.observaciones,
    anuladoPor: v.anuladoPor?.name ?? null,
    fechaAnulacion: v.fechaAnulacion?.toISOString() ?? null,
    motivoAnulacion: v.motivoAnulacion,
    lineas: v.detalles.map((d) => lineaADTO(d, verCosto)),
    pagos: v.pagos.map(pagoADTO),
  };
}

// ─────────────────────────────────────────────────────────────
// Cuentas por cobrar
// ─────────────────────────────────────────────────────────────

export type CuentaPorCobrarDTO = {
  clienteId: number;
  nombre: string;
  documento: string | null;
  telefono: string | null;
  ventas: number;
  saldo: string;
  /** Emisión de la venta pendiente más antigua */
  masAntigua: string;
  dias: number;
};

const DIA_MS = 24 * 60 * 60 * 1000;

/** Clientes con saldo pendiente, ordenados por antigüedad, y totales por tramo. */
export async function cuentasPorCobrar({ q }: { q?: string }) {
  const busqueda = q?.trim();
  const ventas = await prisma.venta.findMany({
    where: {
      estado: "EMITIDA",
      saldo: { gt: 0 },
      clienteId: { not: null },
      ...(busqueda
        ? {
            cliente: {
              OR: [
                { nombre: { contains: busqueda, mode: "insensitive" } },
                { numeroDocumento: { contains: busqueda.toUpperCase() } },
                { telefono: { contains: busqueda } },
              ],
            },
          }
        : {}),
    },
    select: {
      clienteId: true,
      saldo: true,
      fechaEmision: true,
      createdAt: true,
      cliente: { select: { nombre: true, tipoDocumento: true, numeroDocumento: true, telefono: true } },
    },
  });

  const ahora = Date.now();
  const tramos = Object.fromEntries(TRAMOS_ANTIGUEDAD.map((t) => [t.clave, 0])) as Record<TramoAntiguedad, number>;
  const porCliente = new Map<number, CuentaPorCobrarDTO & { centimos: number }>();
  let totalCentimos = 0;

  for (const v of ventas) {
    const fecha = v.fechaEmision ?? v.createdAt;
    const dias = Math.max(Math.floor((ahora - fecha.getTime()) / DIA_MS), 0);
    const centimos = Math.round(Number(v.saldo) * 100);
    totalCentimos += centimos;
    const tramo = TRAMOS_ANTIGUEDAD.find((t) => dias <= t.hasta)!;
    tramos[tramo.clave] += centimos;

    const actual = porCliente.get(v.clienteId!);
    if (actual) {
      actual.ventas += 1;
      actual.centimos += centimos;
      if (dias > actual.dias) {
        actual.dias = dias;
        actual.masAntigua = fecha.toISOString();
      }
    } else {
      porCliente.set(v.clienteId!, {
        clienteId: v.clienteId!,
        nombre: v.cliente!.nombre,
        documento: documentoCliente(v.cliente!.tipoDocumento, v.cliente!.numeroDocumento),
        telefono: v.cliente!.telefono,
        ventas: 1,
        saldo: "",
        masAntigua: fecha.toISOString(),
        dias,
        centimos,
      });
    }
  }

  const clientes: CuentaPorCobrarDTO[] = [...porCliente.values()]
    .sort((a, b) => b.dias - a.dias || b.centimos - a.centimos)
    .map(({ centimos, ...c }) => ({ ...c, saldo: (centimos / 100).toFixed(2) }));

  return {
    clientes,
    total: (totalCentimos / 100).toFixed(2),
    tramos: TRAMOS_ANTIGUEDAD.map((t) => ({ clave: t.clave, label: t.label, monto: (tramos[t.clave] / 100).toFixed(2) })),
  };
}
