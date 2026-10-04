import "server-only";
import type { Prisma } from "../../../generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { decimalATexto } from "@/lib/money";
import type { Opcion } from "@/components/form/select-field";
import type { EstadoFiltro, Funcionamiento, TipoEnchufe, TipoProducto } from "./constants";

export const PAGE_SIZE = 20;

export type PresentacionResumenDTO = {
  id: number;
  nombre: string;
  codigo: string;
  precioVenta: string;
  stock: number;
  stockMinimo: number;
  activo: boolean;
};

export type ProductoListaDTO = {
  id: number;
  tipo: TipoProducto;
  nombre: string;
  modelo: string | null;
  marca: string | null;
  uso: string | null;
  forma: string | null;
  funcionamiento: Funcionamiento | null;
  capacidadKg: string | null;
  precisionG: string | null;
  voltaje: string | null;
  tipoEnchufe: TipoEnchufe | null;
  activo: boolean;
  stockTotal: number;
  stockBajo: boolean;
  presentaciones: PresentacionResumenDTO[];
};

type Filtros = {
  q?: string;
  tipo?: TipoProducto;
  marcaId?: number;
  estado?: EstadoFiltro;
  page: number;
};

export async function listarProductos({ q, tipo, marcaId, estado = "activos", page }: Filtros) {
  const busqueda = q?.trim();
  const where: Prisma.ProductoWhereInput = {
    ...(tipo ? { tipo } : {}),
    ...(marcaId ? { marcaId } : {}),
    ...(estado === "activos" ? { activo: true } : estado === "inactivos" ? { activo: false } : {}),
    ...(busqueda
      ? {
          OR: [
            { nombre: { contains: busqueda, mode: "insensitive" } },
            { modelo: { contains: busqueda, mode: "insensitive" } },
            { marca: { nombre: { contains: busqueda, mode: "insensitive" } } },
            {
              presentaciones: {
                some: {
                  OR: [
                    { codigo: { contains: busqueda, mode: "insensitive" } },
                    { codigoBarras: { equals: busqueda } },
                  ],
                },
              },
            },
          ],
        }
      : {}),
  };

  const [total, filas] = await Promise.all([
    prisma.producto.count({ where }),
    prisma.producto.findMany({
      where,
      orderBy: [{ nombre: "asc" }],
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: {
        marca: { select: { nombre: true } },
        uso: { select: { nombre: true } },
        forma: { select: { nombre: true } },
        presentaciones: { orderBy: [{ activo: "desc" }, { nombre: "asc" }] },
      },
    }),
  ]);

  const items: ProductoListaDTO[] = filas.map((p) => {
    const activas = p.presentaciones.filter((pr) => pr.activo);
    return {
      id: p.id,
      tipo: p.tipo,
      nombre: p.nombre,
      modelo: p.modelo,
      marca: p.marca?.nombre ?? null,
      uso: p.uso?.nombre ?? null,
      forma: p.forma?.nombre ?? null,
      funcionamiento: p.funcionamiento,
      capacidadKg: decimalATexto(p.capacidadKg, 3),
      precisionG: decimalATexto(p.precisionG, 3),
      voltaje: decimalATexto(p.voltaje, 2),
      tipoEnchufe: p.tipoEnchufe,
      activo: p.activo,
      stockTotal: activas.reduce((s, pr) => s + pr.stock, 0),
      stockBajo: activas.some((pr) => pr.stock <= pr.stockMinimo),
      presentaciones: p.presentaciones.map((pr) => ({
        id: pr.id,
        nombre: pr.nombre,
        codigo: pr.codigo,
        precioVenta: decimalATexto(pr.precioVenta) ?? "0.00",
        stock: pr.stock,
        stockMinimo: pr.stockMinimo,
        activo: pr.activo,
      })),
    };
  });

  return { items, total, page, pageSize: PAGE_SIZE };
}

export type PresentacionDetalleDTO = PresentacionResumenDTO & {
  codigoBarras: string | null;
  precioMinimo: string;
  unidadesPorCaja: number | null;
  /** Solo si el usuario puede ver costos */
  costoPromedio: string | null;
  ultimoCosto: string | null;
  tieneHistorial: boolean;
};

export type ProductoDetalleDTO = Omit<ProductoListaDTO, "presentaciones"> & {
  marcaId: number | null;
  usoId: number | null;
  formaId: number | null;
  descripcion: string | null;
  observaciones: string | null;
  createdAt: string;
  updatedAt: string;
  presentaciones: PresentacionDetalleDTO[];
};

export async function obtenerProducto(id: number, { verCosto }: { verCosto: boolean }): Promise<ProductoDetalleDTO | null> {
  const p = await prisma.producto.findUnique({
    where: { id },
    include: {
      marca: { select: { nombre: true } },
      uso: { select: { nombre: true } },
      forma: { select: { nombre: true } },
      presentaciones: {
        orderBy: [{ id: "asc" }],
        include: { _count: { select: { movimientos: true, compraDetalles: true, ventaDetalles: true } } },
      },
    },
  });
  if (!p) return null;
  const activas = p.presentaciones.filter((pr) => pr.activo);

  return {
    id: p.id,
    tipo: p.tipo,
    nombre: p.nombre,
    modelo: p.modelo,
    marcaId: p.marcaId,
    marca: p.marca?.nombre ?? null,
    usoId: p.usoId,
    uso: p.uso?.nombre ?? null,
    formaId: p.formaId,
    forma: p.forma?.nombre ?? null,
    funcionamiento: p.funcionamiento,
    capacidadKg: decimalATexto(p.capacidadKg, 3),
    precisionG: decimalATexto(p.precisionG, 3),
    voltaje: decimalATexto(p.voltaje, 2),
    tipoEnchufe: p.tipoEnchufe,
    descripcion: p.descripcion,
    observaciones: p.observaciones,
    activo: p.activo,
    stockTotal: activas.reduce((s, pr) => s + pr.stock, 0),
    stockBajo: activas.some((pr) => pr.stock <= pr.stockMinimo),
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString(),
    presentaciones: p.presentaciones.map((pr) => ({
      id: pr.id,
      nombre: pr.nombre,
      codigo: pr.codigo,
      codigoBarras: pr.codigoBarras,
      precioVenta: decimalATexto(pr.precioVenta) ?? "0.00",
      precioMinimo: decimalATexto(pr.precioMinimo) ?? "0.00",
      stock: pr.stock,
      stockMinimo: pr.stockMinimo,
      unidadesPorCaja: pr.unidadesPorCaja,
      activo: pr.activo,
      costoPromedio: verCosto ? decimalATexto(pr.costoPromedio, 4) : null,
      ultimoCosto: verCosto ? decimalATexto(pr.ultimoCosto) : null,
      tieneHistorial: pr._count.movimientos + pr._count.compraDetalles + pr._count.ventaDetalles > 0,
    })),
  };
}

export type OpcionesProducto = { marcas: Opcion[]; usos: Opcion[]; formas: Opcion[] };

/** Opciones de catálogos activos (más los ya asignados al producto, aunque estén inactivos). */
export async function opcionesProducto(incluir: { marcaId?: number | null; usoId?: number | null; formaId?: number | null } = {}): Promise<OpcionesProducto> {
  const filtro = (id?: number | null) => ({ OR: [{ activo: true }, ...(id ? [{ id }] : [])] });
  const args = { orderBy: { nombre: "asc" as const }, select: { id: true, nombre: true } };
  const [marcas, usos, formas] = await Promise.all([
    prisma.marca.findMany({ where: filtro(incluir.marcaId), ...args }),
    prisma.usoBalanza.findMany({ where: filtro(incluir.usoId), ...args }),
    prisma.formaBalanza.findMany({ where: filtro(incluir.formaId), ...args }),
  ]);
  const aOpcion = (f: { id: number; nombre: string }) => ({ value: String(f.id), label: f.nombre });
  return { marcas: marcas.map(aOpcion), usos: usos.map(aOpcion), formas: formas.map(aOpcion) };
}

export async function opcionesMarcas(): Promise<Opcion[]> {
  const marcas = await prisma.marca.findMany({ orderBy: { nombre: "asc" }, select: { id: true, nombre: true } });
  return marcas.map((m) => ({ value: String(m.id), label: m.nombre }));
}
