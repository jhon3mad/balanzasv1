import { passwordSchema, z } from "@/lib/validation";

export const loginSchema = z.object({
  username: z.string().trim().toLowerCase().min(1, "Ingresa tu usuario"),
  password: z.string().min(1, "Ingresa tu contraseña"),
  redirect: z.string().optional(),
});

export type LoginInput = z.input<typeof loginSchema>;

export const cambiarClaveSchema = z
  .object({
    actual: z.string().min(1, "Ingresa tu contraseña actual"),
    nueva: passwordSchema,
    confirmar: z.string().min(1, "Confirma la nueva contraseña"),
  })
  .refine((d) => d.nueva === d.confirmar, {
    path: ["confirmar"],
    message: "Las contraseñas no coinciden",
  })
  .refine((d) => d.nueva !== d.actual, {
    path: ["nueva"],
    message: "La nueva contraseña debe ser distinta a la actual",
  });

export type CambiarClaveInput = z.input<typeof cambiarClaveSchema>;
