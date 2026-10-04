"use server";

import { revalidatePath } from "next/cache";
import { formatearNumero } from "@/lib/correlativo";
import { rolTienePermiso } from "@/lib/permissions";
import { createAction, fail, ok } from "@/lib/safe-action";
import {
  anularCompraSchema,
  anularPagoCompraSchema,
  compraSchema,
  pagoCompraSchema,
  recepcionSchema,
} from "./schemas";
import {
  actualizarCompra,
  anularCompra,
  anularPagoCompra,
  crearCompra,
  recibirCompra,
  registrarPagoCompra,
} from "./service";

function revalidar(id?: number) {
  revalidatePath("/compras");
  if (id) revalidatePath(`/compras/${id}`);
  // La recepción y la anulación cambian stock y costos
  revalidatePath("/productos", "layout");
}

export const guardarCompraAction = createAction({
  schema: compraSchema,
  permission: { compra: ["crear"] },
  handler: async (datos, { session }) => {
    if (datos.recibirAhora && !rolTienePermiso(session.user.role, { compra: ["recibir"] })) {
      return fail("No tienes permiso para recibir mercadería.");
    }
    const compra = datos.id
      ? await actualizarCompra(datos.id, datos, session.user.id)
      : await crearCompra(datos, session.user.id);
    const numero = formatearNumero(compra.serie, compra.numero);
    revalidar(compra.id);
    const accion = datos.id ? `Pedido ${numero} actualizado` : `Pedido ${numero} registrado`;
    const mensaje = datos.recibirAhora ? `${accion} y recibido; el stock fue actualizado` : accion;
    return ok({ id: compra.id }, mensaje);
  },
});

export const recibirCompraAction = createAction({
  schema: recepcionSchema,
  permission: { compra: ["recibir"] },
  handler: async (datos, { session }) => {
    await recibirCompra(datos, session.user.id);
    revalidar(datos.compraId);
    return ok(undefined, "Mercadería recibida; el stock fue actualizado");
  },
});

export const registrarPagoCompraAction = createAction({
  schema: pagoCompraSchema,
  permission: { compra: ["pagar"] },
  handler: async (datos, { session }) => {
    const { saldo } = await registrarPagoCompra(datos, session.user.id);
    revalidar(datos.compraId);
    return ok(undefined, saldo.gt(0) ? `Pago registrado. Saldo pendiente: S/ ${saldo.toFixed(2)}` : "Pago registrado. Compra pagada");
  },
});

export const anularPagoCompraAction = createAction({
  schema: anularPagoCompraSchema,
  permission: { compra: ["pagar", "anular"] },
  handler: async ({ pagoId, motivo }, { session }) => {
    const compra = await anularPagoCompra(pagoId, motivo, session.user.id);
    revalidar(compra.id);
    return ok(undefined, "Pago anulado");
  },
});

export const anularCompraAction = createAction({
  schema: anularCompraSchema,
  permission: { compra: ["anular"] },
  handler: async ({ compraId, motivo }, { session }) => {
    const { numero } = await anularCompra(compraId, motivo, session.user.id);
    revalidar(compraId);
    return ok(undefined, `Compra ${numero} anulada`);
  },
});
