import { ROLES } from "@/lib/permissions";
import { passwordSchema, textoRequerido, usernameSchema, z } from "@/lib/validation";

const rolSchema = z.enum(ROLES, { error: "Selecciona un rol válido" });

export const crearUsuarioSchema = z.object({
  name: textoRequerido("El nombre", 100),
  username: usernameSchema,
  role: rolSchema,
  password: passwordSchema,
});
export type CrearUsuarioInput = z.input<typeof crearUsuarioSchema>;

export const editarUsuarioSchema = z.object({
  id: z.string().min(1),
  name: textoRequerido("El nombre", 100),
  role: rolSchema,
});
export type EditarUsuarioInput = z.input<typeof editarUsuarioSchema>;

export const restablecerClaveSchema = z.object({
  id: z.string().min(1),
  password: passwordSchema,
});
export type RestablecerClaveInput = z.input<typeof restablecerClaveSchema>;

export const cambiarEstadoUsuarioSchema = z.object({
  id: z.string().min(1),
  activo: z.boolean(),
});
export type CambiarEstadoUsuarioInput = z.input<typeof cambiarEstadoUsuarioSchema>;
