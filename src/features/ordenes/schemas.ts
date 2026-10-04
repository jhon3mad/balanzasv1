import { hoyLima } from "@/lib/dates";
import {
  decimalTexto,
  decimalTextoOpcional,
  enteroTexto,
  enteroTextoOpcional,
  textoOpcional,
  textoRequerido,
  z,
} from "@/lib/validation";
import { pagoVentaSchema } from "@/features/ventas/schemas";
import { FLUJO_ORDEN } from "./constants";

export const ordenSchema = z
  .object({
    id: z.number().int().positive().optional(),
    /** null solo en el formulario (aún sin elegir); el cliente es obligatorio */
    clienteId: z
      .number()
      .int()
      .positive()
      .nullable()
      .refine((v) => v !== null, "Selecciona o registra al cliente")
      .transform((v) => v as number),
    equipo: textoRequerido("El equipo", 150),
    marca: textoOpcional("La marca", 80),
    modelo: textoOpcional("El modelo", 80),
    numeroSerie: textoOpcional("El n° de serie", 80),
    accesorios: textoOpcional("Los accesorios", 300),
    fallaReportada: textoRequerido("La falla reportada", 500),
    diagnostico: textoOpcional("El diagnóstico", 1000),
    presupuesto: decimalTextoOpcional("El presupuesto"),
    /** "" = sin técnico asignado */
    tecnicoId: z.string().transform((v) => (v === "" ? null : v)),
    /** "YYYY-MM-DD" o "" */
    fechaPrometida: z
      .string()
      .regex(/^(\d{4}-\d{2}-\d{2})?$/, "Ingresa una fecha válida")
      .transform((v) => (v === "" ? null : v)),
    garantiaDias: enteroTextoOpcional("La garantía", { max: 3650 }),
    observaciones: textoOpcional("Las observaciones", 300),
  })
  .superRefine((d, ctx) => {
    // Al recibir el equipo la fecha prometida no puede estar en el pasado
    if (!d.id && d.fechaPrometida && d.fechaPrometida < hoyLima()) {
      ctx.addIssue({ code: "custom", path: ["fechaPrometida"], message: "La fecha prometida no puede ser pasada" });
    }
  });

export type OrdenInput = z.input<typeof ordenSchema>;
export type OrdenOutput = z.output<typeof ordenSchema>;

export const cambiarEstadoOrdenSchema = z.object({
  ordenId: z.number().int().positive(),
  estado: z.enum(FLUJO_ORDEN, { error: "Selecciona el nuevo estado" }),
  nota: textoOpcional("La nota", 300),
});

export type CambiarEstadoOrdenOutput = z.output<typeof cambiarEstadoOrdenSchema>;

export const cancelarOrdenSchema = z.object({
  ordenId: z.number().int().positive(),
  motivo: textoRequerido("El motivo", 200),
});

/** Servicio del catálogo o repuesto del inventario que se agrega a la orden. */
export const itemOrdenSchema = z
  .object({
    ordenId: z.number().int().positive(),
    tipo: z.enum(["SERVICIO", "PRODUCTO"]),
    servicioId: z.number().int().positive().nullable(),
    presentacionId: z.number().int().positive().nullable(),
    cantidad: enteroTexto("La cantidad", { min: 1, max: 1000 }),
    precioUnitario: decimalTexto("El precio"),
  })
  .superRefine((d, ctx) => {
    if (d.tipo === "SERVICIO" && !d.servicioId) {
      ctx.addIssue({ code: "custom", path: ["servicioId"], message: "Selecciona el servicio" });
    }
    if (d.tipo === "PRODUCTO" && !d.presentacionId) {
      ctx.addIssue({ code: "custom", path: ["presentacionId"], message: "Selecciona el repuesto" });
    }
  });

export type ItemOrdenInput = z.input<typeof itemOrdenSchema>;
export type ItemOrdenOutput = z.output<typeof itemOrdenSchema>;

export const quitarItemOrdenSchema = z.object({ detalleId: z.number().int().positive() });

/** Entrega del equipo: emite la boleta y opcionalmente cobra (todo o parte del) saldo. */
export const entregarOrdenSchema = z.object({
  ordenId: z.number().int().positive(),
  pago: pagoVentaSchema
    .refine((p) => p.montoRecibido === null || Number(p.montoRecibido) >= Number(p.monto), {
      path: ["montoRecibido"],
      message: "Lo recibido no puede ser menor al monto",
    })
    .nullable(),
});

export type EntregarOrdenInput = z.input<typeof entregarOrdenSchema>;
export type EntregarOrdenOutput = z.output<typeof entregarOrdenSchema>;

/** Además de cada estado: "EN_CURSO" (no finales) y "VENCIDAS" (en curso con la fecha prometida pasada). */
export const ESTADOS_FILTRO_ORDEN = [
  "EN_CURSO",
  "VENCIDAS",
  "RECIBIDO",
  "EN_DIAGNOSTICO",
  "EN_REPARACION",
  "LISTO",
  "ENTREGADO",
  "CANCELADO",
] as const;
export type EstadoFiltroOrden = (typeof ESTADOS_FILTRO_ORDEN)[number];
