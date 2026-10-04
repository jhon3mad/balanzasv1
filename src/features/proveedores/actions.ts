"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { AppError } from "@/lib/errors";
import { createAction, fail, ok } from "@/lib/safe-action";
import { cambiarEstadoProveedorSchema, eliminarProveedorSchema, proveedorSchema } from "./schemas";

const PERMISO = { proveedor: ["gestionar"] } as const;

export const guardarProveedorAction = createAction({
  schema: proveedorSchema,
  permission: PERMISO,
  handler: async ({ id, ...data }) => {
    if (data.ruc) {
      const existe = await prisma.proveedor.findFirst({
        where: { ruc: data.ruc, NOT: { id: id ?? 0 } },
        select: { razonSocial: true },
      });
      if (existe) return fail("Revisa los datos ingresados.", { ruc: [`Ya está registrado para "${existe.razonSocial}"`] });
    }

    if (id) await prisma.proveedor.update({ where: { id }, data });
    else await prisma.proveedor.create({ data });
    revalidatePath("/proveedores");
    return ok(undefined, id ? "Proveedor actualizado" : `Proveedor "${data.razonSocial}" registrado`);
  },
});

export const cambiarEstadoProveedorAction = createAction({
  schema: cambiarEstadoProveedorSchema,
  permission: PERMISO,
  handler: async ({ id, activo }) => {
    const p = await prisma.proveedor.update({ where: { id }, data: { activo } });
    revalidatePath("/proveedores");
    return ok(undefined, activo ? `"${p.razonSocial}" activado` : `"${p.razonSocial}" desactivado`);
  },
});

export const eliminarProveedorAction = createAction({
  schema: eliminarProveedorSchema,
  permission: PERMISO,
  handler: async ({ id }) => {
    const compras = await prisma.compra.count({ where: { proveedorId: id } });
    if (compras > 0) throw new AppError("El proveedor tiene compras registradas. Desactívalo en lugar de eliminarlo.");
    const p = await prisma.proveedor.delete({ where: { id } });
    revalidatePath("/proveedores");
    return ok(undefined, `"${p.razonSocial}" eliminado`);
  },
});
