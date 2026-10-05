"use server";

import { revalidatePath } from "next/cache";
import { formatPEN } from "@/lib/money";
import { rolTienePermiso } from "@/lib/permissions";
import { createAction, fail, ok } from "@/lib/safe-action";
import { ESTADO_ORDEN_LABELS } from "./constants";
import {
  cambiarEstadoOrdenSchema,
  cancelarOrdenSchema,
  entregarOrdenSchema,
  itemOrdenSchema,
  ordenSchema,
  quitarItemOrdenSchema,
} from "./schemas";
import {
  actualizarOrden,
  agregarItemOrden,
  cambiarEstadoOrden,
  cancelarOrden,
  crearOrden,
  entregarOrden,
  quitarItemOrden,
} from "./service";

function revalidar(id?: number) {
  revalidatePath("/servicios");
  if (id) revalidatePath(`/servicios/${id}`);
}

/** Lo que cambia cuando se mueve stock o se emite la boleta. */
function revalidarStockYVentas(id: number) {
  revalidar(id);
  revalidatePath("/ventas", "layout");
  revalidatePath("/inventario", "layout");
  revalidatePath("/productos", "layout");
  revalidatePath("/clientes");
  revalidatePath("/cuentas-por-cobrar");
  revalidatePath("/caja", "layout");
}

export const guardarOrdenAction = createAction({
  schema: ordenSchema,
  permission: { ordenServicio: ["crear"] },
  handler: async (datos, { session }) => {
    if (datos.id) {
      if (!rolTienePermiso(session.user.role, { ordenServicio: ["actualizar"] })) {
        return fail("No tienes permiso para editar órdenes de servicio.");
      }
      const orden = await actualizarOrden(datos.id, datos, session.user.id);
      revalidar(orden.id);
      return ok({ id: orden.id }, `Orden ${orden.numero} actualizada`);
    }
    const orden = await crearOrden(datos, session.user.id);
    revalidar(orden.id);
    return ok({ id: orden.id }, `Orden ${orden.numero} registrada`);
  },
});

export const cambiarEstadoOrdenAction = createAction({
  schema: cambiarEstadoOrdenSchema,
  permission: { ordenServicio: ["actualizar"] },
  handler: async (datos, { session }) => {
    const { numero } = await cambiarEstadoOrden(datos, session.user.id);
    revalidar(datos.ordenId);
    return ok(undefined, `Orden ${numero}: ${ESTADO_ORDEN_LABELS[datos.estado]}`);
  },
});

export const cancelarOrdenAction = createAction({
  schema: cancelarOrdenSchema,
  permission: { ordenServicio: ["anular"] },
  handler: async ({ ordenId, motivo }, { session }) => {
    const { numero } = await cancelarOrden(ordenId, motivo, session.user.id);
    revalidar(ordenId);
    return ok(undefined, `Orden ${numero} cancelada`);
  },
});

export const agregarItemOrdenAction = createAction({
  schema: itemOrdenSchema,
  permission: { ordenServicio: ["actualizar"] },
  handler: async (datos, { session }) => {
    const r = await agregarItemOrden(datos, {
      usuarioId: session.user.id,
      permitirBajoMinimo: rolTienePermiso(session.user.role, { venta: ["precioBajoMinimo"] }),
    });
    revalidarStockYVentas(datos.ordenId);
    return ok(undefined, `${datos.tipo === "SERVICIO" ? "Servicio" : "Repuesto"} agregado. Total: ${formatPEN(r.total)}`);
  },
});

export const quitarItemOrdenAction = createAction({
  schema: quitarItemOrdenSchema,
  permission: { ordenServicio: ["actualizar"] },
  handler: async ({ detalleId }, { session }) => {
    const r = await quitarItemOrden(detalleId, session.user.id);
    revalidarStockYVentas(r.ordenId);
    return ok(undefined, `Línea quitada. Total: ${formatPEN(r.total)}`);
  },
});

export const entregarOrdenAction = createAction({
  schema: entregarOrdenSchema,
  permission: { ordenServicio: ["actualizar"], venta: ["entregar"] },
  handler: async (datos, { session }) => {
    if (datos.pago && !rolTienePermiso(session.user.role, { venta: ["cobrar"] })) {
      return fail("No tienes permiso para cobrar.");
    }
    const r = await entregarOrden(datos, session.user.id);
    revalidarStockYVentas(datos.ordenId);
    let mensaje = `Orden ${r.numero} entregada con boleta ${r.boleta}`;
    if (Number(r.saldo) > 0) mensaje += `. Saldo pendiente: ${formatPEN(r.saldo)}`;
    if (Number(r.vuelto) > 0) mensaje += `. Vuelto: ${formatPEN(r.vuelto)}`;
    return ok(r, mensaje);
  },
});
