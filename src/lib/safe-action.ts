import "server-only";
import { unstable_rethrow } from "next/navigation";
import { APIError } from "better-auth/api";
import type { z } from "zod";
import { Prisma } from "../../generated/prisma/client";
import { AppError } from "@/lib/errors";
import { mensajeErrorAuth } from "@/lib/auth-errors";
import { rolTienePermiso, type Permisos } from "@/lib/permissions";
import { getSession, type SessionData } from "@/lib/session";
import type { ActionResult, FieldErrors } from "@/lib/action-result";

export function ok<T>(data: T, message: string): ActionResult<T> {
  return { ok: true, message, data };
}

export function fail(message: string, fieldErrors?: FieldErrors): ActionResult<never> {
  return { ok: false, message, fieldErrors };
}

function zodFieldErrors(error: z.ZodError): FieldErrors {
  const result: FieldErrors = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".") || "_root";
    (result[key] ??= []).push(issue.message);
  }
  return result;
}

function manejarError(error: unknown): ActionResult<never> {
  // Deja pasar redirect(), notFound(), etc.
  unstable_rethrow(error);

  if (error instanceof AppError) return fail(error.message);
  if (error instanceof APIError) return fail(mensajeErrorAuth(error));
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2002") return fail("Ya existe un registro con ese valor.");
    if (error.code === "P2025") return fail("El registro no existe o fue eliminado.");
    if (error.code === "P2003") return fail("No se puede completar: el registro está en uso.");
  }
  console.error("[action] error inesperado:", error);
  return fail("Ocurrió un error inesperado. Inténtalo nuevamente.");
}

type Contexto = { session: SessionData };

type ActionOptions<S extends z.ZodType, T> = {
  schema: S;
  /** Permisos requeridos. Si se omite, basta con tener sesión. */
  permission?: Permisos;
  handler: (input: z.output<S>, ctx: Contexto) => Promise<ActionResult<T>>;
};

/**
 * Envuelve una Server Action: verifica sesión y permisos, valida con Zod
 * y convierte cualquier error en un ActionResult con mensaje en español.
 */
export function createAction<S extends z.ZodType, T>(options: ActionOptions<S, T>) {
  return async (input: z.input<S>): Promise<ActionResult<T>> => {
    try {
      const session = await getSession();
      if (!session) return fail("Tu sesión expiró. Vuelve a iniciar sesión.");
      if (options.permission && !rolTienePermiso(session.user.role, options.permission)) {
        return fail("No tienes permiso para realizar esta acción.");
      }
      const parsed = options.schema.safeParse(input);
      if (!parsed.success) {
        return fail("Revisa los datos ingresados.", zodFieldErrors(parsed.error));
      }
      return await options.handler(parsed.data, { session });
    } catch (error) {
      return manejarError(error);
    }
  };
}

/** Igual que createAction pero sin exigir sesión (ej. login). */
export function createPublicAction<S extends z.ZodType, T>(options: {
  schema: S;
  handler: (input: z.output<S>) => Promise<ActionResult<T>>;
}) {
  return async (input: z.input<S>): Promise<ActionResult<T>> => {
    try {
      const parsed = options.schema.safeParse(input);
      if (!parsed.success) {
        return fail("Revisa los datos ingresados.", zodFieldErrors(parsed.error));
      }
      return await options.handler(parsed.data);
    } catch (error) {
      return manejarError(error);
    }
  };
}
