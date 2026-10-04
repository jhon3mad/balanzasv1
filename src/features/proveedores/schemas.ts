import { emailOpcional, rucOpcional, textoOpcional, textoRequerido, z } from "@/lib/validation";

export const proveedorSchema = z.object({
  id: z.number().int().positive().optional(),
  ruc: rucOpcional,
  razonSocial: textoRequerido("La razón social", 150),
  contacto: textoOpcional("El contacto", 100),
  telefono: textoOpcional("El teléfono", 30),
  email: emailOpcional,
  direccion: textoOpcional("La dirección", 200),
  notas: textoOpcional("Las notas", 500),
});

export type ProveedorInput = z.input<typeof proveedorSchema>;
export type ProveedorOutput = z.output<typeof proveedorSchema>;

export const cambiarEstadoProveedorSchema = z.object({
  id: z.number().int().positive(),
  activo: z.boolean(),
});

export const eliminarProveedorSchema = z.object({ id: z.number().int().positive() });

export const ESTADOS_PROVEEDOR = ["activos", "inactivos", "todos"] as const;
