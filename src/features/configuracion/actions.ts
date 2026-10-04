"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { AppError } from "@/lib/errors";
import { registrarAuditoria } from "@/lib/auditoria";
import { createAction, ok } from "@/lib/safe-action";
import type { TipoSerie } from "../../../generated/prisma/client";
import { configuracionSchema, serieSchema } from "./schemas";

export const guardarConfiguracionAction = createAction({
  schema: configuracionSchema,
  permission: { configuracion: ["editar"] },
  handler: async (datos, { session }) => {
    await prisma.configuracion.upsert({
      where: { id: 1 },
      update: datos,
      create: { id: 1, ...datos },
    });
    await registrarAuditoria({
      usuarioId: session.user.id,
      accion: "EDITAR_CONFIGURACION",
      entidad: "configuracion",
      entidadId: 1,
      datos: { ...datos, logoUrl: datos.logoUrl ? "(imagen)" : null },
    });
    // El nombre y el logo se muestran en el layout
    revalidatePath("/", "layout");
    return ok(undefined, "Configuración guardada correctamente");
  },
});

/** Mayor número ya usado por documentos de esa serie. */
async function maximoNumeroUsado(tipo: TipoSerie, serie: string): Promise<number | null> {
  switch (tipo) {
    case "BOLETA":
      return (await prisma.venta.aggregate({ where: { serie }, _max: { numero: true } }))._max.numero;
    case "ORDEN_SERVICIO":
      return (await prisma.ordenServicio.aggregate({ where: { serie }, _max: { numero: true } }))._max.numero;
    case "COMPRA":
      return (await prisma.compra.aggregate({ where: { serie }, _max: { numero: true } }))._max.numero;
  }
}

export const guardarSerieAction = createAction({
  schema: serieSchema,
  permission: { configuracion: ["editar"] },
  handler: async ({ id, serie, ultimoNumero }, { session }) => {
    const actual = await prisma.serie.findUnique({ where: { id } });
    if (!actual) throw new AppError("La serie no existe.");

    if (serie !== actual.serie) {
      const usadosAnterior = await maximoNumeroUsado(actual.tipo, actual.serie);
      if (usadosAnterior !== null) {
        throw new AppError(`No se puede cambiar el código: ya hay documentos emitidos con la serie ${actual.serie}.`);
      }
    }
    const maxUsado = await maximoNumeroUsado(actual.tipo, serie);
    if (maxUsado !== null && ultimoNumero < maxUsado) {
      throw new AppError(`El último número no puede ser menor a ${maxUsado}, que ya fue emitido.`);
    }

    await prisma.serie.update({ where: { id }, data: { serie, ultimoNumero } });
    await registrarAuditoria({
      usuarioId: session.user.id,
      accion: "EDITAR_SERIE",
      entidad: "serie",
      entidadId: id,
      datos: { anterior: { serie: actual.serie, ultimoNumero: actual.ultimoNumero }, nuevo: { serie, ultimoNumero } },
    });
    revalidatePath("/configuracion");
    return ok(undefined, `Serie ${serie} actualizada. El siguiente número será ${ultimoNumero + 1}.`);
  },
});
