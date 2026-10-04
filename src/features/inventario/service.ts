// Ajustes de inventario (transaccional). Los ajustes no se editan ni se borran:
// para corregir uno, se registra otro ajuste en sentido contrario.
import { Prisma } from "../../../generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { AppError } from "@/lib/errors";
import { registrarAuditoria } from "@/lib/auditoria";
import { bloquearPresentacion, nuevoCostoPromedio } from "@/lib/stock";
import { MOTIVO_AJUSTE_INFO } from "./constants";
import type { AjusteOutput } from "./schemas";

export async function registrarAjuste(d: AjusteOutput, usuarioId: string) {
  const modo = MOTIVO_AJUSTE_INFO[d.motivo].modo;

  return prisma.$transaction(
    async (tx) => {
      const ajuste = await tx.ajusteInventario.create({
        data: { motivo: d.motivo, observacion: d.observacion, usuarioId },
      });

      let movimientos = 0;
      for (const linea of d.lineas) {
        const actual = await bloquearPresentacion(tx, linea.presentacionId);

        // Diferencia de stock según el modo del motivo
        const delta =
          modo === "conteo"
            ? linea.cantidad - actual.stock
            : modo === "entrada" || (modo === "libre" && linea.direccion === "ENTRADA")
              ? linea.cantidad
              : -linea.cantidad;
        if (delta === 0) continue;

        const stockNuevo = actual.stock + delta;
        if (stockNuevo < 0) {
          throw new AppError(
            `No hay stock suficiente de "${actual.nombre}": hay ${actual.stock} y se intenta descontar ${-delta}.`,
          );
        }

        const costoEntrada = linea.costoUnitario ? new Prisma.Decimal(linea.costoUnitario) : null;
        const data: Prisma.PresentacionUpdateInput = { stock: stockNuevo };
        if (delta > 0 && costoEntrada) {
          data.costoPromedio = nuevoCostoPromedio(actual.stock, actual.costoPromedio, delta, costoEntrada);
          if (actual.ultimoCosto.isZero()) data.ultimoCosto = costoEntrada.toDecimalPlaces(2);
        }
        await tx.presentacion.update({ where: { id: linea.presentacionId }, data });

        await tx.movimientoInventario.create({
          data: {
            presentacionId: linea.presentacionId,
            tipo: d.motivo === "INVENTARIO_INICIAL" ? "INVENTARIO_INICIAL" : delta > 0 ? "AJUSTE_ENTRADA" : "AJUSTE_SALIDA",
            cantidad: delta,
            stockAnterior: actual.stock,
            stockNuevo,
            // Las salidas se valorizan al costo promedio vigente
            costoUnitario: delta > 0 && costoEntrada ? costoEntrada : actual.costoPromedio,
            ajusteId: ajuste.id,
            usuarioId,
            nota: modo === "conteo" ? `Conteo: sistema ${actual.stock}, contado ${linea.cantidad}` : MOTIVO_AJUSTE_INFO[d.motivo].label,
          },
        });
        movimientos++;
      }

      if (movimientos === 0) {
        throw new AppError("El conteo coincide con el stock registrado; no hay nada que ajustar.");
      }

      await registrarAuditoria(
        {
          usuarioId,
          accion: "AJUSTE_INVENTARIO",
          entidad: "ajuste_inventario",
          entidadId: ajuste.id,
          datos: { motivo: d.motivo, movimientos },
        },
        tx,
      );
      return { id: ajuste.id, movimientos };
    },
    { timeout: 20_000 },
  );
}
