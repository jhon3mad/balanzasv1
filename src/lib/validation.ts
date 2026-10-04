import { z } from "zod";

// Mensajes de error de Zod en español (cliente y servidor)
z.config(z.locales.es());

export { z };

/** Texto obligatorio, sin espacios sobrantes. */
export const textoRequerido = (campo: string, max = 150) =>
  z
    .string()
    .trim()
    .min(1, `${campo} es obligatorio`)
    .max(max, `${campo} no puede tener más de ${max} caracteres`);

/** Texto opcional: "" se convierte en null. */
export const textoOpcional = (campo: string, max = 250) =>
  z
    .string()
    .trim()
    .max(max, `${campo} no puede tener más de ${max} caracteres`)
    .transform((v) => (v === "" ? null : v));

export const passwordSchema = z
  .string()
  .min(8, "La contraseña debe tener al menos 8 caracteres")
  .max(128, "La contraseña no puede tener más de 128 caracteres");

export const usernameSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(3, "El usuario debe tener al menos 3 caracteres")
  .max(30, "El usuario no puede tener más de 30 caracteres")
  .regex(/^[a-z0-9_.]+$/, "Solo letras, números, punto y guion bajo (sin espacios ni tildes)");

export const idSchema = z.coerce.number().int().positive();

/** RUC peruano opcional: "" → null */
export const rucOpcional = z
  .string()
  .trim()
  .refine((v) => v === "" || /^(10|15|17|20)\d{9}$/.test(v), "El RUC debe tener 11 dígitos y empezar con 10, 15, 17 o 20")
  .transform((v) => (v === "" ? null : v));

/** Correo opcional: "" → null */
export const emailOpcional = z
  .string()
  .trim()
  .refine((v) => v === "" || z.email().safeParse(v).success, "Ingresa un correo válido")
  .transform((v) => (v === "" ? null : v.toLowerCase()));

type OpcionesDecimal = { decimales?: number; min?: number; max?: number };

function validarDecimal(v: string, campo: string, { decimales = 2, min = 0, max = 9_999_999 }: OpcionesDecimal) {
  const patron = new RegExp(`^\\d+(\\.\\d{1,${decimales}})?$`);
  if (!patron.test(v)) return `${campo} debe ser un número válido (máx. ${decimales} decimales)`;
  const n = Number(v);
  if (n < min) return `${campo} debe ser mayor o igual a ${min}`;
  if (n > max) return `${campo} es demasiado grande`;
  return null;
}

/**
 * Número decimal escrito en un input de texto. Se mantiene como string
 * (sin pasar por float) y Prisma lo convierte a Decimal.
 */
export const decimalTexto = (campo: string, opciones: OpcionesDecimal = {}) =>
  z
    .string()
    .trim()
    .min(1, `${campo} es obligatorio`)
    .superRefine((v, ctx) => {
      const error = validarDecimal(v, campo, opciones);
      if (error) ctx.addIssue({ code: "custom", message: error });
    });

/** Decimal opcional: "" → null. */
export const decimalTextoOpcional = (campo: string, opciones: OpcionesDecimal = {}) =>
  z
    .string()
    .trim()
    .superRefine((v, ctx) => {
      if (v === "") return;
      const error = validarDecimal(v, campo, opciones);
      if (error) ctx.addIssue({ code: "custom", message: error });
    })
    .transform((v) => (v === "" ? null : v));

/** Entero escrito en un input de texto → number. */
export const enteroTexto = (campo: string, { min = 0, max = 1_000_000 } = {}) =>
  z
    .string()
    .trim()
    .min(1, `${campo} es obligatorio`)
    .regex(/^\d+$/, `${campo} debe ser un número entero`)
    .transform(Number)
    .refine((n) => n >= min, `${campo} debe ser mayor o igual a ${min}`)
    .refine((n) => n <= max, `${campo} es demasiado grande`);

/** Entero opcional: "" → null. */
export const enteroTextoOpcional = (campo: string, { min = 0, max = 1_000_000 } = {}) =>
  z
    .string()
    .trim()
    .regex(/^\d*$/, `${campo} debe ser un número entero`)
    .transform((v) => (v === "" ? null : Number(v)))
    .refine((n) => n === null || n >= min, `${campo} debe ser mayor o igual a ${min}`)
    .refine((n) => n === null || n <= max, `${campo} es demasiado grande`);
