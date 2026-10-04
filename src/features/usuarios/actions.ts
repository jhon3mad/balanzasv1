"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { AppError } from "@/lib/errors";
import { registrarAuditoria } from "@/lib/auditoria";
import { createAction, fail, ok } from "@/lib/safe-action";
import {
  cambiarEstadoUsuarioSchema,
  crearUsuarioSchema,
  editarUsuarioSchema,
  restablecerClaveSchema,
} from "./schemas";

const RUTA = "/usuarios";

/** better-auth exige email; el personal no necesita uno real. */
function emailInterno(username: string) {
  return `${username}@usuarios.local`;
}

async function obtenerUsuario(id: string) {
  const usuario = await prisma.user.findUnique({
    where: { id },
    select: { id: true, name: true, role: true, banned: true },
  });
  if (!usuario) throw new AppError("El usuario no existe.");
  return usuario;
}

/** Evita dejar el sistema sin ningún administrador activo. */
async function asegurarOtroAdminActivo(exceptoId: string) {
  const otros = await prisma.user.count({
    where: { role: "admin", id: { not: exceptoId }, OR: [{ banned: false }, { banned: null }] },
  });
  if (otros === 0) throw new AppError("Debe quedar al menos un administrador activo en el sistema.");
}

export const crearUsuarioAction = createAction({
  schema: crearUsuarioSchema,
  permission: { user: ["create"] },
  handler: async ({ name, username, role, password }, { session }) => {
    const existente = await prisma.user.findUnique({ where: { username }, select: { id: true } });
    if (existente) return fail("Revisa los datos ingresados.", { username: ["Ese nombre de usuario ya está en uso"] });

    const { user } = await auth.api.createUser({
      body: {
        email: emailInterno(username),
        password,
        name,
        role,
        data: { username, displayUsername: username, mustChangePassword: true },
      },
      headers: await headers(),
    });

    await registrarAuditoria({
      usuarioId: session.user.id,
      accion: "CREAR_USUARIO",
      entidad: "user",
      entidadId: user.id,
      datos: { username, role },
    });
    revalidatePath(RUTA);
    return ok(undefined, `Usuario "${username}" creado. Deberá cambiar su contraseña al ingresar.`);
  },
});

export const editarUsuarioAction = createAction({
  schema: editarUsuarioSchema,
  permission: { user: ["update", "set-role"] },
  handler: async ({ id, name, role }, { session }) => {
    const usuario = await obtenerUsuario(id);
    const cambiaRol = usuario.role !== role;

    if (cambiaRol && id === session.user.id) {
      throw new AppError("No puedes cambiar tu propio rol.");
    }
    if (cambiaRol && usuario.role === "admin") {
      await asegurarOtroAdminActivo(id);
    }

    // La sesión se lee de la BD en cada petición, así que el nuevo rol aplica de inmediato.
    await prisma.user.update({ where: { id }, data: { name, role } });

    if (cambiaRol) {
      await registrarAuditoria({
        usuarioId: session.user.id,
        accion: "CAMBIAR_ROL",
        entidad: "user",
        entidadId: id,
        datos: { anterior: usuario.role, nuevo: role },
      });
    }
    revalidatePath(RUTA);
    return ok(undefined, "Usuario actualizado correctamente");
  },
});

export const restablecerClaveAction = createAction({
  schema: restablecerClaveSchema,
  permission: { user: ["set-password"] },
  handler: async ({ id, password }, { session }) => {
    if (id === session.user.id) {
      throw new AppError("Para cambiar tu propia contraseña usa la opción \"Cambiar contraseña\".");
    }
    await obtenerUsuario(id);
    const h = await headers();

    await auth.api.setUserPassword({ body: { userId: id, newPassword: password }, headers: h });
    await prisma.user.update({ where: { id }, data: { mustChangePassword: true } });
    // Cierra sus sesiones abiertas para que ingrese con la nueva clave
    await auth.api.revokeUserSessions({ body: { userId: id }, headers: h });

    await registrarAuditoria({
      usuarioId: session.user.id,
      accion: "RESTABLECER_CLAVE",
      entidad: "user",
      entidadId: id,
    });
    revalidatePath(RUTA);
    return ok(undefined, "Contraseña restablecida. El usuario deberá cambiarla al ingresar.");
  },
});

export const cambiarEstadoUsuarioAction = createAction({
  schema: cambiarEstadoUsuarioSchema,
  permission: { user: ["ban"] },
  handler: async ({ id, activo }, { session }) => {
    const usuario = await obtenerUsuario(id);
    const h = await headers();

    if (activo) {
      await auth.api.unbanUser({ body: { userId: id }, headers: h });
    } else {
      if (id === session.user.id) throw new AppError("No puedes desactivar tu propio usuario.");
      if (usuario.role === "admin") await asegurarOtroAdminActivo(id);
      // banUser también cierra todas sus sesiones
      await auth.api.banUser({
        body: { userId: id, banReason: "Desactivado por el administrador" },
        headers: h,
      });
    }

    await registrarAuditoria({
      usuarioId: session.user.id,
      accion: activo ? "ACTIVAR_USUARIO" : "DESACTIVAR_USUARIO",
      entidad: "user",
      entidadId: id,
    });
    revalidatePath(RUTA);
    return ok(undefined, activo ? `Usuario "${usuario.name}" activado` : `Usuario "${usuario.name}" desactivado`);
  },
});
