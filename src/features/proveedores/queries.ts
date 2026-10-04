import "server-only";
import type { Prisma } from "../../../generated/prisma/client";
import { prisma } from "@/lib/prisma";
import type { ESTADOS_PROVEEDOR } from "./schemas";

export const PAGE_SIZE = 20;

export type ProveedorDTO = {
  id: number;
  ruc: string | null;
  razonSocial: string;
  contacto: string | null;
  telefono: string | null;
  email: string | null;
  direccion: string | null;
  notas: string | null;
  activo: boolean;
  compras: number;
};

type Filtros = { q?: string; estado?: (typeof ESTADOS_PROVEEDOR)[number]; page: number };

export async function listarProveedores({ q, estado = "activos", page }: Filtros) {
  const busqueda = q?.trim();
  const where: Prisma.ProveedorWhereInput = {
    ...(estado === "activos" ? { activo: true } : estado === "inactivos" ? { activo: false } : {}),
    ...(busqueda
      ? {
          OR: [
            { razonSocial: { contains: busqueda, mode: "insensitive" } },
            { ruc: { contains: busqueda } },
            { contacto: { contains: busqueda, mode: "insensitive" } },
            { telefono: { contains: busqueda } },
          ],
        }
      : {}),
  };

  const [total, filas] = await Promise.all([
    prisma.proveedor.count({ where }),
    prisma.proveedor.findMany({
      where,
      orderBy: { razonSocial: "asc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: { _count: { select: { compras: true } } },
    }),
  ]);

  const items: ProveedorDTO[] = filas.map((p) => ({
    id: p.id,
    ruc: p.ruc,
    razonSocial: p.razonSocial,
    contacto: p.contacto,
    telefono: p.telefono,
    email: p.email,
    direccion: p.direccion,
    notas: p.notas,
    activo: p.activo,
    compras: p._count.compras,
  }));
  return { items, total, page, pageSize: PAGE_SIZE };
}
