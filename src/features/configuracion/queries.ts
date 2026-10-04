import "server-only";
import { cache } from "react";
import { prisma } from "@/lib/prisma";

export const getConfiguracion = cache(async () => {
  const config = await prisma.configuracion.findUnique({ where: { id: 1 } });
  return (
    config ?? {
      id: 1,
      nombreComercial: "Sistema de Ventas",
      razonSocial: null,
      ruc: null,
      direccion: null,
      telefono: null,
      email: null,
      logoUrl: null,
      tituloComprobante: "BOLETA DE VENTA",
      piePagina: null,
      formatoTicket: "MM80" as const,
      updatedAt: new Date(0),
    }
  );
});

export type ConfiguracionDTO = Awaited<ReturnType<typeof getConfiguracion>>;

export async function getSeries() {
  return prisma.serie.findMany({ orderBy: [{ tipo: "asc" }, { serie: "asc" }] });
}
