import { decimalTexto, textoOpcional, textoRequerido, z } from "@/lib/validation";

export const abrirCajaSchema = z.object({
  montoInicial: decimalTexto("El fondo inicial"),
});

export const TIPOS_MOVIMIENTO_CAJA = ["INGRESO", "EGRESO"] as const;
export type TipoMovimientoCaja = (typeof TIPOS_MOVIMIENTO_CAJA)[number];

export const movimientoCajaSchema = z.object({
  tipo: z.enum(TIPOS_MOVIMIENTO_CAJA),
  monto: decimalTexto("El monto").refine((v) => Number(v) > 0, "El monto debe ser mayor a 0"),
  concepto: textoRequerido("El concepto", 150),
});

export type MovimientoCajaInput = z.input<typeof movimientoCajaSchema>;
export type MovimientoCajaOutput = z.output<typeof movimientoCajaSchema>;

export const cerrarCajaSchema = z.object({
  efectivoContado: decimalTexto("El efectivo contado"),
  observaciones: textoOpcional("Las observaciones", 300),
});

export type CerrarCajaInput = z.input<typeof cerrarCajaSchema>;
export type CerrarCajaOutput = z.output<typeof cerrarCajaSchema>;
