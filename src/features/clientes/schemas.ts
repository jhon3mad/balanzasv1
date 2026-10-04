import { emailOpcional, textoOpcional, textoRequerido, z } from "@/lib/validation";

export const TIPOS_DOCUMENTO = ["DNI", "RUC", "CE", "PASAPORTE", "OTRO"] as const;
export type TipoDocumento = (typeof TIPOS_DOCUMENTO)[number];

export const TIPO_DOCUMENTO_LABELS: Record<TipoDocumento, string> = {
  DNI: "DNI",
  RUC: "RUC",
  CE: "Carné de extranjería",
  PASAPORTE: "Pasaporte",
  OTRO: "Otro",
};

const FORMATO_DOCUMENTO: Record<TipoDocumento, { regex: RegExp; mensaje: string }> = {
  DNI: { regex: /^\d{8}$/, mensaje: "El DNI debe tener 8 dígitos" },
  RUC: { regex: /^(10|15|17|20)\d{9}$/, mensaje: "El RUC debe tener 11 dígitos y empezar con 10, 15, 17 o 20" },
  CE: { regex: /^[A-Za-z0-9]{8,12}$/, mensaje: "El carné de extranjería debe tener de 8 a 12 caracteres" },
  PASAPORTE: { regex: /^[A-Za-z0-9]{6,12}$/, mensaje: "El pasaporte debe tener de 6 a 12 caracteres" },
  OTRO: { regex: /^[A-Za-z0-9-]{1,20}$/, mensaje: "Máximo 20 caracteres (letras, números y guion)" },
};

export const clienteSchema = z
  .object({
    id: z.number().int().positive().optional(),
    tipoDocumento: z.union([z.literal(""), z.enum(TIPOS_DOCUMENTO)]),
    numeroDocumento: z.string().trim().toUpperCase(),
    nombre: textoRequerido("El nombre", 150),
    telefono: textoOpcional("El celular", 30),
    direccion: textoOpcional("La dirección", 200),
    email: emailOpcional,
    notas: textoOpcional("Las notas", 500),
  })
  .superRefine((d, ctx) => {
    if (d.tipoDocumento && !d.numeroDocumento) {
      ctx.addIssue({ code: "custom", path: ["numeroDocumento"], message: "Ingresa el número de documento" });
    }
    if (!d.tipoDocumento && d.numeroDocumento) {
      ctx.addIssue({ code: "custom", path: ["tipoDocumento"], message: "Selecciona el tipo de documento" });
    }
    if (d.tipoDocumento && d.numeroDocumento) {
      const formato = FORMATO_DOCUMENTO[d.tipoDocumento];
      if (!formato.regex.test(d.numeroDocumento)) {
        ctx.addIssue({ code: "custom", path: ["numeroDocumento"], message: formato.mensaje });
      }
    }
  })
  .transform((d) => ({
    ...d,
    tipoDocumento: d.tipoDocumento || null,
    numeroDocumento: d.tipoDocumento ? d.numeroDocumento : null,
  }));

export type ClienteInput = z.input<typeof clienteSchema>;
export type ClienteOutput = z.output<typeof clienteSchema>;

export const cambiarEstadoClienteSchema = z.object({ id: z.number().int().positive(), activo: z.boolean() });
export const eliminarClienteSchema = z.object({ id: z.number().int().positive() });

export const ESTADOS_CLIENTE = ["activos", "inactivos", "todos"] as const;

/** "DNI 12345678" */
export function documentoCliente(tipo: TipoDocumento | null, numero: string | null): string | null {
  if (!tipo || !numero) return null;
  return `${tipo === "CE" ? "CE" : TIPO_DOCUMENTO_LABELS[tipo]} ${numero}`;
}
