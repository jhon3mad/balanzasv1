"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { AppError } from "@/lib/errors";
import { createAction, fail, ok } from "@/lib/safe-action";
import { cambiarEstadoClienteSchema, clienteSchema, documentoCliente, eliminarClienteSchema } from "./schemas";

const PERMISO = { cliente: ["gestionar"] } as const;

export type ClienteGuardado = { id: number; nombre: string; documento: string | null; telefono: string | null };

export const guardarClienteAction = createAction({
  schema: clienteSchema,
  permission: PERMISO,
  handler: async ({ id, ...data }) => {
    if (data.tipoDocumento && data.numeroDocumento) {
      const existe = await prisma.cliente.findFirst({
        where: { tipoDocumento: data.tipoDocumento, numeroDocumento: data.numeroDocumento, NOT: { id: id ?? 0 } },
        select: { nombre: true },
      });
      if (existe) {
        return fail("Revisa los datos ingresados.", { numeroDocumento: [`Ya está registrado para "${existe.nombre}"`] });
      }
    }

    const cliente = id
      ? await prisma.cliente.update({ where: { id }, data })
      : await prisma.cliente.create({ data });
    revalidatePath("/clientes");
    return ok<ClienteGuardado>(
      {
        id: cliente.id,
        nombre: cliente.nombre,
        documento: documentoCliente(cliente.tipoDocumento, cliente.numeroDocumento),
        telefono: cliente.telefono,
      },
      id ? "Cliente actualizado" : `Cliente "${cliente.nombre}" registrado`,
    );
  },
});

export const cambiarEstadoClienteAction = createAction({
  schema: cambiarEstadoClienteSchema,
  permission: PERMISO,
  handler: async ({ id, activo }) => {
    const c = await prisma.cliente.update({ where: { id }, data: { activo } });
    revalidatePath("/clientes");
    return ok(undefined, activo ? `"${c.nombre}" activado` : `"${c.nombre}" desactivado`);
  },
});

export const eliminarClienteAction = createAction({
  schema: eliminarClienteSchema,
  permission: PERMISO,
  handler: async ({ id }) => {
    const ventas = await prisma.venta.count({ where: { clienteId: id } });
    if (ventas > 0) throw new AppError("El cliente tiene ventas registradas. Desactívalo en lugar de eliminarlo.");
    const c = await prisma.cliente.delete({ where: { id } });
    revalidatePath("/clientes");
    return ok(undefined, `"${c.nombre}" eliminado`);
  },
});
