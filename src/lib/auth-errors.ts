import type { APIError } from "better-auth/api";

const MENSAJES: Record<string, string> = {
  INVALID_USERNAME_OR_PASSWORD: "Usuario o contraseña incorrectos.",
  INVALID_EMAIL_OR_PASSWORD: "Usuario o contraseña incorrectos.",
  INVALID_PASSWORD: "La contraseña actual es incorrecta.",
  PASSWORD_TOO_SHORT: "La contraseña es demasiado corta.",
  PASSWORD_TOO_LONG: "La contraseña es demasiado larga.",
  USERNAME_IS_ALREADY_TAKEN: "Ese nombre de usuario ya está en uso.",
  USERNAME_TOO_SHORT: "El nombre de usuario es demasiado corto.",
  USERNAME_TOO_LONG: "El nombre de usuario es demasiado largo.",
  INVALID_USERNAME: "El nombre de usuario no es válido.",
  USER_ALREADY_EXISTS: "Ya existe un usuario con esos datos.",
  USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL: "Ya existe un usuario con ese correo.",
  BANNED_USER: "Tu usuario está desactivado. Comunícate con el administrador.",
  YOU_CANNOT_BAN_YOURSELF: "No puedes desactivar tu propio usuario.",
  YOU_CANNOT_REMOVE_YOURSELF: "No puedes eliminar tu propio usuario.",
  CREDENTIAL_ACCOUNT_NOT_FOUND: "El usuario no tiene contraseña configurada.",
  SESSION_EXPIRED: "Tu sesión expiró. Vuelve a iniciar sesión.",
  USER_NOT_FOUND: "El usuario no existe.",
};

export function mensajeErrorAuth(error: APIError): string {
  const body = error.body as { code?: string; message?: string } | undefined;
  const code = body?.code;
  if (code && MENSAJES[code]) return MENSAJES[code];
  if (error.status === "UNAUTHORIZED") return "No autorizado. Vuelve a iniciar sesión.";
  if (error.status === "FORBIDDEN") return "No tienes permiso para realizar esta acción.";
  return "No se pudo completar la operación de autenticación.";
}
