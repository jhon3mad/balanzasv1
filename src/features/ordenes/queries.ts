import "server-only";
import type { Prisma } from "../../../generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { formatearNumero } from "@/lib/correlativo";
import { hoyLima, rangoFechasLima } from "@/lib/dates";
import { decimalATexto } from "@/lib/money";
import type { Opcion } from "@/components/form/select-field";
import { documentoCliente } from "@/features/clientes/schemas";
import { INCLUDE_PAGOS, lineaADTO, pagoADTO, type LineaVentaDTO, type PagoVentaDTO } from "@/features/ventas/queries";
import { ESTADOS_FINALES, type EstadoOrden } from "./constants";
import type { EstadoFiltroOrden } from "./schemas";
import { ROLES_TECNICO } from "./service";

export const PAGE_SIZE = 20;

/** Inicio del día de hoy en Lima: una orden en curso con fecha prometida anterior está vencida. */
function inicioDeHoy(): Date {
  const hoy = hoyLima();
  return rangoFechasLima(hoy, hoy).gte!;
}

const EN_CURSO: Prisma.OrdenServicioWhereInput = { estado: { notIn: [...ESTADOS_FINALES] as EstadoOrden[] } };

export type OrdenListaDTO = {
  id: number;
  numero: string;
  fechaRecepcion: string;
  cliente: string;
  clienteTelefono: string | null;
  equipo: string;
  marcaModelo: string | null;
  estado: EstadoOrden;
  tecnico: string | null;
  fechaPrometida: string | null;
  vencida: boolean;
};

type Filtros = {
  q?: string;
  estado?: EstadoFiltroOrden;
  tecnicoId?: string;
  desde?: string;
  hasta?: string;
  page: number;
};

export async function listarOrdenes({ q, estado, tecnicoId, desde, hasta, page }: Filtros) {
  const busqueda = q?.trim();
  const numero = busqueda?.match(/(\d+)\s*$/)?.[1];
  const rango = rangoFechasLima(desde, hasta);
  const hoy = inicioDeHoy();

  const where: Prisma.OrdenServicioWhereInput = {
    ...(estado === "EN_CURSO"
      ? EN_CURSO
      : estado === "VENCIDAS"
        ? { ...EN_CURSO, fechaPrometida: { lt: hoy } }
        : estado
          ? { estado }
          : {}),
    ...(tecnicoId ? { tecnicoId } : {}),
    ...(rango.gte || rango.lt ? { fechaRecepcion: rango } : {}),
    ...(busqueda
      ? {
          OR: [
            { venta: { cliente: { nombre: { contains: busqueda, mode: "insensitive" } } } },
            { venta: { cliente: { numeroDocumento: { contains: busqueda.toUpperCase() } } } },
            { venta: { cliente: { telefono: { contains: busqueda } } } },
            { equipo: { contains: busqueda, mode: "insensitive" } },
            { numeroSerie: { contains: busqueda, mode: "insensitive" } },
            ...(numero && numero.length <= 9 ? [{ numero: Number(numero) }] : []),
          ],
        }
      : {}),
  };

  const [total, filas] = await Promise.all([
    prisma.ordenServicio.count({ where }),
    prisma.ordenServicio.findMany({
      where,
      orderBy: [{ fechaRecepcion: "desc" }, { id: "desc" }],
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: {
        tecnico: { select: { name: true } },
        venta: { select: { cliente: { select: { nombre: true, telefono: true } } } },
      },
    }),
  ]);

  const items: OrdenListaDTO[] = filas.map((o) => ({
    id: o.id,
    numero: formatearNumero(o.serie, o.numero),
    fechaRecepcion: o.fechaRecepcion.toISOString(),
    cliente: o.venta.cliente?.nombre ?? "—",
    clienteTelefono: o.venta.cliente?.telefono ?? null,
    equipo: o.equipo,
    marcaModelo: [o.marca, o.modelo].filter(Boolean).join(" ") || null,
    estado: o.estado,
    tecnico: o.tecnico?.name ?? null,
    fechaPrometida: o.fechaPrometida?.toISOString() ?? null,
    vencida: !ESTADOS_FINALES.includes(o.estado) && !!o.fechaPrometida && o.fechaPrometida < hoy,
  }));

  return { items, total, page, pageSize: PAGE_SIZE };
}

/** Contadores para el encabezado de la lista. */
export async function resumenOrdenes() {
  const [enCurso, listas, vencidas] = await Promise.all([
    prisma.ordenServicio.count({ where: EN_CURSO }),
    prisma.ordenServicio.count({ where: { estado: "LISTO" } }),
    prisma.ordenServicio.count({ where: { ...EN_CURSO, fechaPrometida: { lt: inicioDeHoy() } } }),
  ]);
  return { enCurso, listas, vencidas };
}

export type HistorialOrdenDTO = {
  id: number;
  estadoAnterior: EstadoOrden | null;
  estadoNuevo: EstadoOrden;
  nota: string | null;
  usuario: string;
  fecha: string;
};

export type OrdenDetalleDTO = OrdenListaDTO & {
  ventaId: number;
  clienteId: number;
  clienteDocumento: string | null;
  marca: string | null;
  modelo: string | null;
  numeroSerie: string | null;
  accesorios: string | null;
  fallaReportada: string;
  diagnostico: string | null;
  presupuesto: string | null;
  tecnicoId: string | null;
  garantiaDias: number | null;
  observaciones: string | null;
  recibidoPor: string;
  fechaListo: string | null;
  fechaEntrega: string | null;
  /** Para saber si se puede cancelar */
  tieneItems: boolean;
  totalLista: string;
  total: string;
  montoPagado: string;
  saldo: string;
  /** Boleta emitida al entregar */
  boleta: string | null;
  lineas: LineaVentaDTO[];
  pagos: PagoVentaDTO[];
  historial: HistorialOrdenDTO[];
};

export async function obtenerOrden(id: number, { verCosto = false } = {}): Promise<OrdenDetalleDTO | null> {
  const o = await prisma.ordenServicio.findUnique({
    where: { id },
    include: {
      tecnico: { select: { name: true } },
      venta: {
        select: {
          clienteId: true,
          observaciones: true,
          serie: true,
          numero: true,
          totalLista: true,
          total: true,
          montoPagado: true,
          saldo: true,
          vendedor: { select: { name: true } },
          cliente: { select: { nombre: true, telefono: true, tipoDocumento: true, numeroDocumento: true } },
          detalles: { orderBy: { id: "asc" }, include: { presentacion: { select: { codigo: true } } } },
          pagos: INCLUDE_PAGOS,
        },
      },
      historial: { orderBy: [{ fecha: "asc" }, { id: "asc" }], include: { usuario: { select: { name: true } } } },
    },
  });
  if (!o) return null;
  const hoy = inicioDeHoy();
  const cliente = o.venta.cliente;

  return {
    id: o.id,
    ventaId: o.ventaId,
    numero: formatearNumero(o.serie, o.numero),
    fechaRecepcion: o.fechaRecepcion.toISOString(),
    clienteId: o.venta.clienteId!,
    cliente: cliente?.nombre ?? "—",
    clienteTelefono: cliente?.telefono ?? null,
    clienteDocumento: cliente ? documentoCliente(cliente.tipoDocumento, cliente.numeroDocumento) : null,
    equipo: o.equipo,
    marca: o.marca,
    modelo: o.modelo,
    marcaModelo: [o.marca, o.modelo].filter(Boolean).join(" ") || null,
    numeroSerie: o.numeroSerie,
    accesorios: o.accesorios,
    fallaReportada: o.fallaReportada,
    diagnostico: o.diagnostico,
    presupuesto: o.presupuesto ? decimalATexto(o.presupuesto) : null,
    estado: o.estado,
    tecnicoId: o.tecnicoId,
    tecnico: o.tecnico?.name ?? null,
    fechaPrometida: o.fechaPrometida?.toISOString() ?? null,
    vencida: !ESTADOS_FINALES.includes(o.estado) && !!o.fechaPrometida && o.fechaPrometida < hoy,
    garantiaDias: o.garantiaDias,
    observaciones: o.venta.observaciones,
    recibidoPor: o.venta.vendedor.name,
    fechaListo: o.fechaListo?.toISOString() ?? null,
    fechaEntrega: o.fechaEntrega?.toISOString() ?? null,
    tieneItems: o.venta.detalles.length > 0,
    totalLista: decimalATexto(o.venta.totalLista) ?? "0.00",
    total: decimalATexto(o.venta.total) ?? "0.00",
    montoPagado: decimalATexto(o.venta.montoPagado) ?? "0.00",
    saldo: decimalATexto(o.venta.saldo) ?? "0.00",
    boleta: o.venta.serie && o.venta.numero ? formatearNumero(o.venta.serie, o.venta.numero) : null,
    lineas: o.venta.detalles.map((d) => lineaADTO(d, verCosto)),
    pagos: o.venta.pagos.map(pagoADTO),
    historial: o.historial.map((h) => ({
      id: h.id,
      estadoAnterior: h.estadoAnterior,
      estadoNuevo: h.estadoNuevo,
      nota: h.nota,
      usuario: h.usuario.name,
      fecha: h.fecha.toISOString(),
    })),
  };
}

/** Usuarios activos que pueden ser técnicos (incluye al actual aunque ya no lo sea). */
export async function opcionesTecnicos(incluirId?: string | null): Promise<Opcion[]> {
  const usuarios = await prisma.user.findMany({
    where: {
      OR: [
        // banned admite null: "distinto de true" en SQL descartaría los null
        { role: { in: ROLES_TECNICO }, OR: [{ banned: false }, { banned: null }] },
        ...(incluirId ? [{ id: incluirId }] : []),
      ],
    },
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });
  return usuarios.map((u) => ({ value: u.id, label: u.name }));
}

export type ServicioOpcion = { id: number; nombre: string; precio: string };

/** Servicios activos del catálogo para agregar a la orden. */
export async function opcionesServicios(): Promise<ServicioOpcion[]> {
  const servicios = await prisma.servicio.findMany({ where: { activo: true }, orderBy: { nombre: "asc" } });
  return servicios.map((s) => ({ id: s.id, nombre: s.nombre, precio: decimalATexto(s.precioReferencial) ?? "0.00" }));
}

/** Marcas del catálogo, como sugerencia para el campo de texto libre. */
export async function sugerenciasMarcas(): Promise<string[]> {
  const marcas = await prisma.marca.findMany({ where: { activo: true }, orderBy: { nombre: "asc" }, select: { nombre: true } });
  return marcas.map((m) => m.nombre);
}
