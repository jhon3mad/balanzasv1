import { textoOpcional, textoRequerido, z } from "@/lib/validation";

export const FORMATOS_TICKET = ["MM58", "MM80", "A4"] as const;

export const FORMATO_TICKET_LABELS: Record<(typeof FORMATOS_TICKET)[number], string> = {
  MM58: "Ticket 58 mm",
  MM80: "Ticket 80 mm",
  A4: "Hoja A4",
};

/** ~300 KB de imagen codificada en base64 */
const MAX_LOGO_CHARS = 400_000;

export const configuracionSchema = z.object({
  nombreComercial: textoRequerido("El nombre comercial", 100),
  razonSocial: textoOpcional("La razón social", 150),
  ruc: z
    .string()
    .trim()
    .refine((v) => v === "" || /^(10|15|17|20)\d{9}$/.test(v), "El RUC debe tener 11 dígitos y empezar con 10, 15, 17 o 20")
    .transform((v) => (v === "" ? null : v)),
  direccion: textoOpcional("La dirección", 200),
  telefono: textoOpcional("El teléfono", 30),
  email: z
    .string()
    .trim()
    .refine((v) => v === "" || z.email().safeParse(v).success, "Ingresa un correo válido")
    .transform((v) => (v === "" ? null : v)),
  logoUrl: z
    .string()
    .refine(
      (v) => v === "" || /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(v),
      "El logo debe ser una imagen PNG, JPG o WEBP",
    )
    .refine((v) => v.length <= MAX_LOGO_CHARS, "El logo no debe pesar más de 300 KB")
    .transform((v) => (v === "" ? null : v)),
  tituloComprobante: textoRequerido("El título del comprobante", 40),
  piePagina: textoOpcional("El pie de página", 300),
  formatoTicket: z.enum(FORMATOS_TICKET, { error: "Selecciona un formato válido" }),
});

export type ConfiguracionInput = z.input<typeof configuracionSchema>;
export type ConfiguracionOutput = z.output<typeof configuracionSchema>;

export const serieSchema = z.object({
  id: z.number().int().positive(),
  serie: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z0-9]{4}$/, "La serie debe tener 4 caracteres (letras y números)"),
  ultimoNumero: z
    .number({ error: "Ingresa un número" })
    .int("Debe ser un número entero")
    .min(0, "No puede ser negativo")
    .max(99_999_999, "Número demasiado grande"),
});

export type SerieInput = z.input<typeof serieSchema>;
