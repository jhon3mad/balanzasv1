"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { registrarAuditoria } from "@/lib/auditoria";
import { createAction, createPublicAction, ok } from "@/lib/safe-action";
import { cambiarClaveSchema, loginSchema } from "./schemas";

/** Solo se permiten rutas internas para evitar redirecciones abiertas. */
function destinoSeguro(redirect: string | undefined): string {
  if (redirect && redirect.startsWith("/") && !redirect.startsWith("//")) return redirect;
  return "/";
}

export const loginAction = createPublicAction({
  schema: loginSchema,
  handler: async ({ username, password, redirect: destino }) => {
    const resultado = await auth.api.signInUsername({
      body: { username, password, rememberMe: true },
      headers: await headers(),
    });
    const usuario = await prisma.user.findUnique({
      where: { id: resultado?.user.id ?? "" },
      select: { name: true, mustChangePassword: true },
    });
    const redirectTo = usuario?.mustChangePassword ? "/cambiar-clave" : destinoSeguro(destino);
    return ok({ redirectTo }, `Bienvenido, ${usuario?.name ?? username}`);
  },
});

export async function logoutAction() {
  await auth.api.signOut({ headers: await headers() });
  redirect("/login");
}

export const cambiarClaveAction = createAction({
  schema: cambiarClaveSchema,
  handler: async ({ actual, nueva }, { session }) => {
    await auth.api.changePassword({
      body: { currentPassword: actual, newPassword: nueva, revokeOtherSessions: true },
      headers: await headers(),
    });
    await prisma.user.update({
      where: { id: session.user.id },
      data: { mustChangePassword: false },
    });
    await registrarAuditoria({
      usuarioId: session.user.id,
      accion: "CAMBIAR_CLAVE",
      entidad: "user",
      entidadId: session.user.id,
    });
    return ok({ redirectTo: "/" }, "Contraseña actualizada correctamente");
  },
});
