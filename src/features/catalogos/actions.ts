"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { AppError } from "@/lib/errors";
import { createAction, fail, ok } from "@/lib/safe-action";
import {
  CATALOGO_SIMPLE_LABELS,
  cambiarEstadoCatalogoSchema,
  catalogoSimpleSchema,
  eliminarCatalogoSchema,
  metodoPagoSchema,
  servicioSchema,
  type CatalogoSimple,
  type EntidadCatalogo,
} from "./schemas";

const PERMISO = { catalogo: ["gestionar"] } as const;

function revalidar() {
  revalidatePath("/catalogos", "layout");
  revalidatePath("/productos", "layout");
}

const NOMBRE_DUPLICADO = { nombre: ["Ya existe un registro con ese nombre"] };

async function nombreSimpleExiste(entidad: CatalogoSimple, nombre: string, exceptoId?: number) {
  const where = { nombre: { equals: nombre, mode: "insensitive" as const }, NOT: { id: exceptoId ?? 0 } };
  const existe =
    entidad === "marca"
      ? await prisma.marca.findFirst({ where, select: { id: true } })
      : entidad === "uso"
        ? await prisma.usoBalanza.findFirst({ where, select: { id: true } })
        : await prisma.formaBalanza.findFirst({ where, select: { id: true } });
  return !!existe;
}

export const guardarCatalogoSimpleAction = createAction({
  schema: catalogoSimpleSchema,
  permission: PERMISO,
  handler: async ({ entidad, id, nombre }) => {
    if (await nombreSimpleExiste(entidad, nombre, id)) return fail("Revisa los datos ingresados.", NOMBRE_DUPLICADO);

    const data = { nombre };
    if (entidad === "marca") {
      if (id) await prisma.marca.update({ where: { id }, data });
      else await prisma.marca.create({ data });
    } else if (entidad === "uso") {
      if (id) await prisma.usoBalanza.update({ where: { id }, data });
      else await prisma.usoBalanza.create({ data });
    } else {
      if (id) await prisma.formaBalanza.update({ where: { id }, data });
      else await prisma.formaBalanza.create({ data });
    }
    revalidar();
    const etiqueta = CATALOGO_SIMPLE_LABELS[entidad].singular;
    return ok(undefined, id ? `Se actualizó la ${etiqueta} "${nombre}"` : `Se registró la ${etiqueta} "${nombre}"`);
  },
});

export const guardarServicioAction = createAction({
  schema: servicioSchema,
  permission: PERMISO,
  handler: async ({ id, ...data }) => {
    const existe = await prisma.servicio.findFirst({
      where: { nombre: { equals: data.nombre, mode: "insensitive" }, NOT: { id: id ?? 0 } },
      select: { id: true },
    });
    if (existe) return fail("Revisa los datos ingresados.", NOMBRE_DUPLICADO);

    if (id) await prisma.servicio.update({ where: { id }, data });
    else await prisma.servicio.create({ data });
    revalidar();
    return ok(undefined, id ? "Servicio actualizado" : "Servicio registrado");
  },
});

export const guardarMetodoPagoAction = createAction({
  schema: metodoPagoSchema,
  permission: PERMISO,
  handler: async ({ id, ...data }) => {
    const existe = await prisma.metodoPago.findFirst({
      where: { nombre: { equals: data.nombre, mode: "insensitive" }, NOT: { id: id ?? 0 } },
      select: { id: true },
    });
    if (existe) return fail("Revisa los datos ingresados.", NOMBRE_DUPLICADO);

    if (id) await prisma.metodoPago.update({ where: { id }, data });
    else await prisma.metodoPago.create({ data });
    revalidar();
    return ok(undefined, id ? "Método de pago actualizado" : "Método de pago registrado");
  },
});

async function actualizarActivo(entidad: EntidadCatalogo, id: number, activo: boolean) {
  const args = { where: { id }, data: { activo } };
  switch (entidad) {
    case "marca":
      return prisma.marca.update(args);
    case "uso":
      return prisma.usoBalanza.update(args);
    case "forma":
      return prisma.formaBalanza.update(args);
    case "servicio":
      return prisma.servicio.update(args);
    case "metodoPago":
      if (!activo) {
        const activos = await prisma.metodoPago.count({ where: { activo: true, NOT: { id } } });
        if (activos === 0) throw new AppError("Debe quedar al menos un método de pago activo.");
      }
      return prisma.metodoPago.update(args);
  }
}

export const cambiarEstadoCatalogoAction = createAction({
  schema: cambiarEstadoCatalogoSchema,
  permission: PERMISO,
  handler: async ({ entidad, id, activo }) => {
    const registro = await actualizarActivo(entidad, id, activo);
    revalidar();
    return ok(undefined, activo ? `"${registro.nombre}" activado` : `"${registro.nombre}" desactivado`);
  },
});

async function eliminarRegistro(entidad: EntidadCatalogo, id: number) {
  const args = { where: { id } };
  switch (entidad) {
    case "marca":
      return prisma.marca.delete(args);
    case "uso":
      return prisma.usoBalanza.delete(args);
    case "forma":
      return prisma.formaBalanza.delete(args);
    case "servicio":
      return prisma.servicio.delete(args);
    case "metodoPago":
      return prisma.metodoPago.delete(args);
  }
}

export const eliminarCatalogoAction = createAction({
  schema: eliminarCatalogoSchema,
  permission: PERMISO,
  // Si está en uso, la BD rechaza el borrado (FK) y safe-action devuelve un mensaje claro.
  handler: async ({ entidad, id }) => {
    const registro = await eliminarRegistro(entidad, id);
    revalidar();
    return ok(undefined, `"${registro.nombre}" eliminado`);
  },
});
