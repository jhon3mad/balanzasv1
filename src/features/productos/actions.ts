"use server";

import { revalidatePath } from "next/cache";
import { rolTienePermiso } from "@/lib/permissions";
import { createAction, fail, ok } from "@/lib/safe-action";
import { cambiarEstadoProductoSchema, eliminarProductoSchema, productoSchema } from "./schemas";
import {
  actualizarProducto,
  cambiarEstadoProducto,
  crearProducto,
  eliminarProducto,
  validarCodigosUnicos,
} from "./service";

function revalidar(id?: number) {
  revalidatePath("/productos");
  if (id) revalidatePath(`/productos/${id}`);
}

export const guardarProductoAction = createAction({
  schema: productoSchema,
  permission: { producto: ["crear"] },
  handler: async (datos, { session }) => {
    const editando = datos.id !== undefined;
    if (editando && !rolTienePermiso(session.user.role, { producto: ["editar"] })) {
      return fail("No tienes permiso para editar productos.");
    }

    const conStockInicial = datos.presentaciones.some((p) => !p.id && (p.stockInicial ?? 0) > 0);
    if (conStockInicial && !rolTienePermiso(session.user.role, { inventario: ["ajustar"] })) {
      return fail("No tienes permiso para registrar stock inicial.");
    }

    const erroresCodigo = await validarCodigosUnicos(datos.presentaciones, datos.id);
    if (erroresCodigo) return fail("Hay códigos que ya están registrados.", erroresCodigo);

    const producto = editando
      ? await actualizarProducto(datos.id!, datos, session.user.id)
      : await crearProducto(datos, session.user.id);

    revalidar(producto.id);
    return ok({ id: producto.id }, editando ? "Producto actualizado correctamente" : "Producto registrado correctamente");
  },
});

export const cambiarEstadoProductoAction = createAction({
  schema: cambiarEstadoProductoSchema,
  permission: { producto: ["editar"] },
  handler: async ({ id, activo }, { session }) => {
    const producto = await cambiarEstadoProducto(id, activo, session.user.id);
    revalidar(id);
    return ok(undefined, activo ? `"${producto.nombre}" activado` : `"${producto.nombre}" desactivado`);
  },
});

export const eliminarProductoAction = createAction({
  schema: eliminarProductoSchema,
  permission: { producto: ["eliminar"] },
  handler: async ({ id }, { session }) => {
    const producto = await eliminarProducto(id, session.user.id);
    revalidar();
    return ok(undefined, `"${producto.nombre}" eliminado`);
  },
});
