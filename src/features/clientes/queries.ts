import "server-only";
import type { Prisma } from "../../../generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { decimalATexto } from "@/lib/money";
import type { ESTADOS_CLIENTE, TipoDocumento } from "./schemas";

export const PAGE_SIZE = 20;

export type ClienteDTO = {
  id: number;
  tipoDocumento: TipoDocumento | null;
  numeroDocumento: string | null;
  nombre: string;
  telefono: string | null;
  direccion: string | null;
  email: string | null;
  notas: string | null;
  activo: boolean;
  ventas: number;
  /** Saldo pendiente de sus ventas no anuladas */
  saldo: string;
};

type Filtros = { q?: string; estado?: (typeof ESTADOS_CLIENTE)[number]; conDeuda?: boolean; page: number };

export async function listarClientes({ q, estado = "activos", conDeuda, page }: Filtros) {
  const busqueda = q?.trim();
  const where: Prisma.ClienteWhereInput = {
    ...(estado === "activos" ? { activo: true } : estado === "inactivos" ? { activo: false } : {}),
    // Solo ventas emitidas: una orden de servicio abierta aún no es deuda
    ...(conDeuda ? { ventas: { some: { estado: "EMITIDA", saldo: { gt: 0 } } } } : {}),
    ...(busqueda
      ? {
          OR: [
            { nombre: { contains: busqueda, mode: "insensitive" } },
            { numeroDocumento: { contains: busqueda.toUpperCase() } },
            { telefono: { contains: busqueda } },
          ],
        }
      : {}),
  };

  const [total, filas] = await Promise.all([
    prisma.cliente.count({ where }),
    prisma.cliente.findMany({
      where,
      orderBy: { nombre: "asc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: { _count: { select: { ventas: true } } },
    }),
  ]);

  // Saldos pendientes de los clientes de esta página
  const saldos = await prisma.venta.groupBy({
    by: ["clienteId"],
    where: { clienteId: { in: filas.map((c) => c.id) }, estado: "EMITIDA", saldo: { gt: 0 } },
    _sum: { saldo: true },
  });
  const saldoPorCliente = new Map(saldos.map((s) => [s.clienteId, s._sum.saldo]));

  const items: ClienteDTO[] = filas.map((c) => ({
    id: c.id,
    tipoDocumento: c.tipoDocumento,
    numeroDocumento: c.numeroDocumento,
    nombre: c.nombre,
    telefono: c.telefono,
    direccion: c.direccion,
    email: c.email,
    notas: c.notas,
    activo: c.activo,
    ventas: c._count.ventas,
    saldo: decimalATexto(saldoPorCliente.get(c.id) ?? 0) ?? "0.00",
  }));
  return { items, total, page, pageSize: PAGE_SIZE };
}
