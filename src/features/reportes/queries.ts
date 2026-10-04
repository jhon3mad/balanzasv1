import "server-only";
import { Prisma } from "../../../generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { formatearNumero } from "@/lib/correlativo";
import { hoyLima, rangoFechasLima } from "@/lib/dates";
import { decimalATexto } from "@/lib/money";
import type { TipoProducto } from "@/features/productos/constants";
import { agrupacionDe, serieCalendario, sumarDias, type Periodo } from "./periodo";

const ZONA = "America/Lima";
const txt = (v: Prisma.Decimal | number | null | undefined) => decimalATexto(v ?? 0) ?? "0.00";

/** Filtro opcional por vendedor (el vendedor solo ve lo suyo). */
const porVendedor = (columna: Prisma.Sql, vendedorId?: string) =>
  vendedorId ? Prisma.sql`AND ${columna} = ${vendedorId}` : Prisma.empty;

/** Costo de cada venta (suma de cantidad × costo guardado en cada línea). */
const COSTO_POR_VENTA = Prisma.sql`
  LEFT JOIN (
    SELECT "ventaId", SUM(cantidad * "costoUnitario") AS costo FROM "venta_detalle" GROUP BY "ventaId"
  ) c ON c."ventaId" = v.id`;

// ───────────────────────────── Ventas ─────────────────────────────

export type PuntoVentas = { clave: string; ventas: number; total: string; costo: string };

/** Ventas emitidas por día (o por mes en periodos largos), sin huecos. */
export async function ventasEnElTiempo(p: Periodo, vendedorId?: string) {
  const agrupacion = agrupacionDe(p);
  const formato = agrupacion === "dia" ? "YYYY-MM-DD" : "YYYY-MM";
  const filas = await prisma.$queryRaw<{ clave: string; ventas: number; total: Prisma.Decimal; costo: Prisma.Decimal | null }[]>`
    SELECT to_char(v."fechaEmision" AT TIME ZONE ${ZONA}, ${formato}) AS clave,
           COUNT(*)::int AS ventas, SUM(v.total) AS total, SUM(c.costo) AS costo
    FROM "venta" v ${COSTO_POR_VENTA}
    WHERE v.estado = 'EMITIDA' AND v."fechaEmision" >= ${p.gte} AND v."fechaEmision" < ${p.lt}
      ${porVendedor(Prisma.sql`v."vendedorId"`, vendedorId)}
    GROUP BY clave ORDER BY clave`;
  const porClave = new Map(filas.map((f) => [f.clave, f]));
  const puntos: PuntoVentas[] = serieCalendario(p, agrupacion).map((clave) => {
    const f = porClave.get(clave);
    return { clave, ventas: f?.ventas ?? 0, total: txt(f?.total), costo: txt(f?.costo) };
  });
  return { agrupacion, puntos };
}

export type ResumenVentas = { ventas: number; total: string; costo: string; descuento: string; cobrado: string; saldo: string; anuladas: number };

export async function resumenVentas(p: Periodo, vendedorId?: string): Promise<ResumenVentas> {
  const [fila] = await prisma.$queryRaw<
    { ventas: number; total: Prisma.Decimal | null; costo: Prisma.Decimal | null; descuento: Prisma.Decimal | null; saldo: Prisma.Decimal | null }[]
  >`
    SELECT COUNT(*)::int AS ventas, SUM(v.total) AS total, SUM(c.costo) AS costo,
           SUM(GREATEST(v.descuento, 0)) AS descuento, SUM(v.saldo) AS saldo
    FROM "venta" v ${COSTO_POR_VENTA}
    WHERE v.estado = 'EMITIDA' AND v."fechaEmision" >= ${p.gte} AND v."fechaEmision" < ${p.lt}
      ${porVendedor(Prisma.sql`v."vendedorId"`, vendedorId)}`;
  const [cobros, anuladas] = await Promise.all([
    cobrosPorMetodo(p, vendedorId),
    prisma.venta.count({
      where: { estado: "ANULADA", numero: { not: null }, fechaEmision: { gte: p.gte, lt: p.lt }, ...(vendedorId ? { vendedorId } : {}) },
    }),
  ]);
  const cobrado = cobros.reduce((s, c) => s + Math.round(Number(c.monto) * 100), 0);
  return {
    ventas: fila?.ventas ?? 0,
    total: txt(fila?.total),
    costo: txt(fila?.costo),
    descuento: txt(fila?.descuento),
    cobrado: (cobrado / 100).toFixed(2),
    saldo: txt(fila?.saldo),
    anuladas,
  };
}

export type VentasVendedor = { vendedorId: string; vendedor: string; ventas: number; total: string; costo: string; saldo: string };

export async function ventasPorVendedor(p: Periodo): Promise<VentasVendedor[]> {
  const filas = await prisma.$queryRaw<
    { vendedorId: string; vendedor: string; ventas: number; total: Prisma.Decimal; costo: Prisma.Decimal | null; saldo: Prisma.Decimal }[]
  >`
    SELECT u.id AS "vendedorId", u.name AS vendedor, COUNT(*)::int AS ventas,
           SUM(v.total) AS total, SUM(c.costo) AS costo, SUM(v.saldo) AS saldo
    FROM "venta" v JOIN "user" u ON u.id = v."vendedorId" ${COSTO_POR_VENTA}
    WHERE v.estado = 'EMITIDA' AND v."fechaEmision" >= ${p.gte} AND v."fechaEmision" < ${p.lt}
    GROUP BY u.id, u.name ORDER BY total DESC`;
  return filas.map((f) => ({ ...f, total: txt(f.total), costo: txt(f.costo), saldo: txt(f.saldo) }));
}

export type CobroMetodo = { metodo: string; pagos: number; monto: string };

/**
 * Dinero recibido en el periodo por método de pago (incluye cobros de saldo y adelantos
 * de órdenes). Con vendedor: lo que ese usuario cobró.
 */
export async function cobrosPorMetodo(p: Periodo, usuarioId?: string): Promise<CobroMetodo[]> {
  const filas = await prisma.$queryRaw<{ metodo: string; pagos: number; monto: Prisma.Decimal }[]>`
    SELECT m.nombre AS metodo, COUNT(*)::int AS pagos, SUM(pg.monto) AS monto
    FROM "pago" pg JOIN "metodo_pago" m ON m.id = pg."metodoPagoId"
    WHERE NOT pg.anulado AND pg.fecha >= ${p.gte} AND pg.fecha < ${p.lt}
      ${porVendedor(Prisma.sql`pg."usuarioId"`, usuarioId)}
    GROUP BY m.id, m.nombre, m.orden ORDER BY m.orden, m.nombre`;
  return filas.map((f) => ({ ...f, monto: txt(f.monto) }));
}

export type VentaReporte = {
  numero: string;
  fecha: Date;
  cliente: string;
  vendedor: string;
  tipo: string;
  total: string;
  costo: string;
  pagado: string;
  saldo: string;
  estado: string;
};

/** Listado de boletas del periodo (para Excel). Incluye anuladas, marcadas. */
export async function listadoVentas(p: Periodo, vendedorId?: string): Promise<VentaReporte[]> {
  const ventas = await prisma.venta.findMany({
    where: { numero: { not: null }, fechaEmision: { gte: p.gte, lt: p.lt }, ...(vendedorId ? { vendedorId } : {}) },
    orderBy: [{ fechaEmision: "asc" }, { id: "asc" }],
    take: 20_000,
    include: {
      cliente: { select: { nombre: true } },
      vendedor: { select: { name: true } },
      detalles: { select: { cantidad: true, costoUnitario: true } },
    },
  });
  return ventas.map((v) => ({
    numero: formatearNumero(v.serie!, v.numero!),
    fecha: v.fechaEmision!,
    cliente: v.cliente?.nombre ?? "Cliente general",
    vendedor: v.vendedor.name,
    tipo: v.tipo === "SERVICIO" ? "Servicio" : "Venta",
    total: txt(v.total),
    costo: txt(v.detalles.reduce((s, d) => s.add(d.costoUnitario.mul(d.cantidad)), new Prisma.Decimal(0))),
    pagado: txt(v.montoPagado),
    saldo: txt(v.saldo),
    estado: v.estado === "ANULADA" ? "Anulada" : v.estadoPago === "PAGADO" ? "Pagada" : v.estadoPago === "PARCIAL" ? "Pago parcial" : "Sin pagar",
  }));
}

// ───────────────────────────── Productos ─────────────────────────────

export type MasVendido = {
  tipo: "PRODUCTO" | "SERVICIO";
  descripcion: string;
  codigo: string | null;
  cantidad: number;
  ventas: number;
  total: string;
  costo: string;
};

/** Productos y servicios más vendidos del periodo (por importe o por cantidad). */
export async function masVendidos(p: Periodo, orden: "importe" | "cantidad", limite = 50): Promise<MasVendido[]> {
  const ordenSql = orden === "cantidad" ? Prisma.sql`cantidad DESC, total DESC` : Prisma.sql`total DESC, cantidad DESC`;
  const filas = await prisma.$queryRaw<
    { tipo: "PRODUCTO" | "SERVICIO"; descripcion: string; codigo: string | null; cantidad: number; ventas: number; total: Prisma.Decimal; costo: Prisma.Decimal }[]
  >`
    SELECT d."tipoItem" AS tipo,
           COALESCE(MAX(p.nombre || CASE WHEN pr.nombre = 'Estándar' THEN '' ELSE ' — ' || pr.nombre END), MAX(s.nombre), MAX(d.descripcion)) AS descripcion,
           MAX(pr.codigo) AS codigo,
           SUM(d.cantidad)::int AS cantidad, COUNT(DISTINCT v.id)::int AS ventas,
           SUM(d.subtotal) AS total, SUM(d.cantidad * d."costoUnitario") AS costo
    FROM "venta_detalle" d
    JOIN "venta" v ON v.id = d."ventaId"
    LEFT JOIN "presentacion" pr ON pr.id = d."presentacionId"
    LEFT JOIN "producto" p ON p.id = pr."productoId"
    LEFT JOIN "servicio" s ON s.id = d."servicioId"
    WHERE v.estado = 'EMITIDA' AND v."fechaEmision" >= ${p.gte} AND v."fechaEmision" < ${p.lt}
    GROUP BY d."tipoItem", d."presentacionId", d."servicioId"
    ORDER BY ${ordenSql}
    LIMIT ${limite}`;
  return filas.map((f) => ({ ...f, total: txt(f.total), costo: txt(f.costo) }));
}

// ───────────────────────────── Compras ─────────────────────────────

export type ComprasProveedor = { proveedor: string; compras: number; total: string; pagado: string; saldo: string };

/** Compras recibidas en el periodo, por proveedor. */
export async function comprasPorProveedor(p: Periodo): Promise<ComprasProveedor[]> {
  const filas = await prisma.$queryRaw<{ proveedor: string; compras: number; total: Prisma.Decimal; pagado: Prisma.Decimal }[]>`
    SELECT pv."razonSocial" AS proveedor, COUNT(*)::int AS compras, SUM(c.total) AS total, SUM(c."montoPagado") AS pagado
    FROM "compra" c JOIN "proveedor" pv ON pv.id = c."proveedorId"
    WHERE c.estado = 'RECIBIDA' AND c."fechaRecepcion" >= ${p.gte} AND c."fechaRecepcion" < ${p.lt}
    GROUP BY pv.id, pv."razonSocial" ORDER BY total DESC`;
  return filas.map((f) => ({ proveedor: f.proveedor, compras: f.compras, total: txt(f.total), pagado: txt(f.pagado), saldo: txt(f.total.sub(f.pagado)) }));
}

export type DeudaProveedor = { proveedor: string; compras: number; saldo: string; masAntigua: Date };

/** Saldo pendiente con cada proveedor (todas las fechas). */
export async function cuentasPorPagar(): Promise<DeudaProveedor[]> {
  const filas = await prisma.$queryRaw<{ proveedor: string; compras: number; saldo: Prisma.Decimal; masAntigua: Date }[]>`
    SELECT pv."razonSocial" AS proveedor, COUNT(*)::int AS compras,
           SUM(c.total - c."montoPagado") AS saldo, MIN(COALESCE(c."fechaRecepcion", c."fechaPedido")) AS "masAntigua"
    FROM "compra" c JOIN "proveedor" pv ON pv.id = c."proveedorId"
    WHERE c.estado <> 'ANULADA' AND c.total > c."montoPagado"
    GROUP BY pv.id, pv."razonSocial" ORDER BY saldo DESC`;
  return filas.map((f) => ({ ...f, saldo: txt(f.saldo) }));
}

// ───────────────────────────── Inventario ─────────────────────────────

export type ValorTipo = { tipo: TipoProducto; items: number; unidades: number; valor: string; valorVenta: string };

/** Inventario valorizado (al costo promedio y a precio de venta) por tipo de producto. */
export async function valorizadoPorTipo(): Promise<ValorTipo[]> {
  const filas = await prisma.$queryRaw<
    { tipo: TipoProducto; items: number; unidades: bigint; valor: Prisma.Decimal | null; valorVenta: Prisma.Decimal | null }[]
  >`
    SELECT p.tipo, COUNT(*)::int AS items, SUM(pr.stock) AS unidades,
           SUM(pr.stock * pr."costoPromedio") AS valor, SUM(pr.stock * pr."precioVenta") AS "valorVenta"
    FROM "presentacion" pr JOIN "producto" p ON p.id = pr."productoId"
    WHERE pr.activo AND p.activo
    GROUP BY p.tipo ORDER BY valor DESC NULLS LAST`;
  return filas.map((f) => ({ ...f, unidades: Number(f.unidades ?? 0), valor: txt(f.valor), valorVenta: txt(f.valorVenta) }));
}

export type StockBajo = { codigo: string; producto: string; stock: number; stockMinimo: number; costo: string };

export async function stockBajo(limite = 200): Promise<StockBajo[]> {
  const filas = await prisma.presentacion.findMany({
    where: { activo: true, producto: { activo: true }, stock: { lte: prisma.presentacion.fields.stockMinimo } },
    orderBy: [{ stock: "asc" }, { producto: { nombre: "asc" } }],
    take: limite,
    include: { producto: { select: { nombre: true } } },
  });
  return filas.map((p) => ({
    codigo: p.codigo,
    producto: p.nombre === "Estándar" ? p.producto.nombre : `${p.producto.nombre} — ${p.nombre}`,
    stock: p.stock,
    stockMinimo: p.stockMinimo,
    costo: txt(p.costoPromedio),
  }));
}

// ───────────────────────────── Inicio ─────────────────────────────

/** Indicadores del día para el inicio. Con vendedor, solo lo suyo. */
export async function indicadoresHoy(vendedorId?: string) {
  const hoy = hoyLima();
  const r = rangoFechasLima(hoy, hoy);
  const periodo: Periodo = { desde: hoy, hasta: hoy, gte: r.gte!, lt: r.lt!, dias: 1 };
  const [resumen, porCobrar] = await Promise.all([
    resumenVentas(periodo, vendedorId),
    vendedorId ? null : prisma.venta.aggregate({ where: { estado: "EMITIDA", saldo: { gt: 0 } }, _sum: { saldo: true } }),
  ]);
  return { ...resumen, porCobrar: porCobrar ? txt(porCobrar._sum.saldo) : null };
}

/** Últimos 14 días para el gráfico del inicio. */
export async function ventasUltimosDias(dias = 14) {
  const hoy = hoyLima();
  const desde = sumarDias(hoy, -(dias - 1));
  const r = rangoFechasLima(desde, hoy);
  return (await ventasEnElTiempo({ desde, hasta: hoy, gte: r.gte!, lt: r.lt!, dias })).puntos;
}
