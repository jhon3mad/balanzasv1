"use server";

import { revalidatePath } from "next/cache";
import { formatPEN } from "@/lib/money";
import { rolTienePermiso } from "@/lib/permissions";
import { createAction, ok } from "@/lib/safe-action";
import {
  anularPagoVentaSchema,
  anularVentaSchema,
  cambiarClienteVentaSchema,
  cobroSchema,
  devolucionSchema,
  ventaIdSchema,
  ventaSchema,
} from "./schemas";
import {
  anularPagoVenta,
  anularVenta,
  cambiarClienteVenta,
  crearVenta,
  marcarEntregada,
  registrarCobro,
  registrarDevolucion,
} from "./service";

/** Lo que cambia con cobros y entregas: ventas, saldos de clientes y cuentas por cobrar. */
function revalidarVenta(id: number) {
  revalidatePath("/ventas");
  revalidatePath(`/ventas/${id}`);
  revalidatePath("/clientes");
  revalidatePath("/cuentas-por-cobrar");
  // Los adelantos de una orden de servicio se cobran y anulan con estas mismas acciones
  revalidatePath("/servicios", "layout");
  // El efectivo cobrado entra en el arqueo de la caja abierta
  revalidatePath("/caja", "layout");
}

export const emitirVentaAction = createAction({
  schema: ventaSchema,
  permission: { venta: ["crear"] },
  handler: async (datos, { session }) => {
    const venta = await crearVenta(datos, {
      usuarioId: session.user.id,
      permitirBajoMinimo: rolTienePermiso(session.user.role, { venta: ["precioBajoMinimo"] }),
    });
    revalidatePath("/ventas", "layout");
    revalidatePath("/inventario", "layout");
    revalidatePath("/productos", "layout");
    revalidatePath("/clientes");
    revalidatePath("/cuentas-por-cobrar");
    revalidatePath("/caja", "layout");
    return ok(venta, `Venta ${venta.numero} emitida`);
  },
});

export const cobrarVentaAction = createAction({
  schema: cobroSchema,
  permission: { venta: ["cobrar"] },
  handler: async (datos, { session }) => {
    const r = await registrarCobro(datos, session.user.id);
    revalidarVenta(datos.ventaId);
    const mensaje = Number(r.saldo) > 0 ? `Pago registrado. Saldo pendiente: ${formatPEN(r.saldo)}` : `Venta ${r.numero} pagada`;
    return ok(r, Number(r.vuelto) > 0 ? `${mensaje}. Vuelto: ${formatPEN(r.vuelto)}` : mensaje);
  },
});

export const entregarVentaAction = createAction({
  schema: ventaIdSchema,
  permission: { venta: ["entregar"] },
  handler: async ({ ventaId }, { session }) => {
    const { numero } = await marcarEntregada(ventaId, session.user.id);
    revalidarVenta(ventaId);
    return ok(undefined, `Venta ${numero} entregada`);
  },
});

export const cambiarClienteVentaAction = createAction({
  schema: cambiarClienteVentaSchema,
  permission: { venta: ["cobrar"] },
  handler: async ({ ventaId, clienteId }, { session }) => {
    await cambiarClienteVenta(ventaId, clienteId, session.user.id);
    revalidarVenta(ventaId);
    return ok(undefined, "Cliente actualizado");
  },
});

export const anularPagoVentaAction = createAction({
  schema: anularPagoVentaSchema,
  permission: { venta: ["cobrar", "anular"] },
  handler: async ({ pagoId, motivo }, { session }) => {
    const { ventaId, saldo } = await anularPagoVenta(pagoId, motivo, session.user.id);
    revalidarVenta(ventaId);
    return ok(undefined, `Pago anulado. Saldo pendiente: ${formatPEN(saldo)}`);
  },
});

export const devolucionAction = createAction({
  schema: devolucionSchema,
  permission: { venta: ["devolver"] },
  handler: async (datos, { session }) => {
    const r = await registrarDevolucion(datos, session.user.id);
    revalidarVenta(datos.ventaId);
    revalidatePath("/inventario", "layout");
    revalidatePath("/productos", "layout");
    revalidatePath("/caja", "layout");
    const mensaje =
      Number(r.reembolso) > 0
        ? `Devolución registrada. Devolver al cliente: ${formatPEN(r.reembolso)}`
        : `Devolución de ${formatPEN(r.total)} registrada (se rebajó del saldo)`;
    return ok(r, mensaje);
  },
});

export const anularVentaAction = createAction({
  schema: anularVentaSchema,
  permission: { venta: ["anular"] },
  handler: async ({ ventaId, motivo }, { session }) => {
    const { numero, devolver } = await anularVenta(ventaId, motivo, session.user.id);
    revalidarVenta(ventaId);
    revalidatePath("/inventario", "layout");
    revalidatePath("/productos", "layout");
    const mensaje = Number(devolver) > 0 ? `Venta ${numero} anulada. Devolver al cliente: ${formatPEN(devolver)}` : `Venta ${numero} anulada`;
    return ok(undefined, mensaje);
  },
});
