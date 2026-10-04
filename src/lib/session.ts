import "server-only";
import { cache } from "react";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { rolTienePermiso, type Permisos } from "@/lib/permissions";

/** Sesión actual (una sola consulta por petición gracias a `cache`). */
export const getSession = cache(async () => {
  return auth.api.getSession({ headers: await headers() });
});

export type SessionData = NonNullable<Awaited<ReturnType<typeof getSession>>>;

/** Exige sesión; si no hay, redirige al login. */
export async function requireSession(): Promise<SessionData> {
  const session = await getSession();
  if (!session) redirect("/login");
  return session;
}

/** Exige sesión y permisos; si no los tiene, muestra la página de acceso denegado. */
export async function requirePermission(permisos: Permisos): Promise<SessionData> {
  const session = await requireSession();
  if (!rolTienePermiso(session.user.role, permisos)) redirect("/sin-permiso");
  return session;
}

export async function can(permisos: Permisos): Promise<boolean> {
  const session = await getSession();
  return !!session && rolTienePermiso(session.user.role, permisos);
}
