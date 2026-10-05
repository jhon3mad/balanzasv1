"use server";

import { revalidatePath } from "next/cache";
import { formatPEN } from "@/lib/money";
import { createAction, ok } from "@/lib/safe-action";
import { abrirCajaSchema, cerrarCajaSchema, movimientoCajaSchema } from "./schemas";
import { abrirCaja, cerrarCaja, registrarMovimientoCaja } from "./service";

function revalidar() {
  revalidatePath("/caja", "layout");
  revalidatePath("/");
  revalidatePath("/ventas/nueva");
}

export const abrirCajaAction = createAction({
  schema: abrirCajaSchema,
  permission: { caja: ["operar"] },
  handler: async ({ montoInicial }, { session }) => {
    const r = await abrirCaja(montoInicial, session.user.id);
    revalidar();
    return ok(r, `Caja abierta con ${formatPEN(montoInicial)}`);
  },
});

export const movimientoCajaAction = createAction({
  schema: movimientoCajaSchema,
  permission: { caja: ["operar"] },
  handler: async (datos, { session }) => {
    await registrarMovimientoCaja(datos, session.user.id);
    revalidar();
    return ok(undefined, `${datos.tipo === "INGRESO" ? "Ingreso" : "Retiro"} de ${formatPEN(datos.monto)} registrado`);
  },
});

export const cerrarCajaAction = createAction({
  schema: cerrarCajaSchema,
  permission: { caja: ["operar"] },
  handler: async (datos, { session }) => {
    const r = await cerrarCaja(datos, session.user.id);
    revalidar();
    const dif = Number(r.diferencia);
    const mensaje =
      dif === 0 ? "Caja cerrada: cuadra exacto" : dif > 0 ? `Caja cerrada con sobrante de ${formatPEN(dif)}` : `Caja cerrada con faltante de ${formatPEN(-dif)}`;
    return ok(r, mensaje);
  },
});
