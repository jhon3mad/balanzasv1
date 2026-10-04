import { hoyLima } from "@/lib/dates";
import { decimalTexto, enteroTexto, textoOpcional, textoRequerido, z } from "@/lib/validation";
import { TIPOS_EMPAQUE } from "./constants";

const fechaSchema = (campo: string) =>
  z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, `Ingresa ${campo}`)
    .refine((v) => v <= hoyLima(), `${campo[0]!.toUpperCase()}${campo.slice(1)} no puede ser futura`);

const idRequerido = (mensaje: string) =>
  z
    .string()
    .regex(/^\d+$/, mensaje)
    .transform(Number);

export const detalleCompraSchema = z.object({
  presentacionId: z.number({ error: "Selecciona el producto" }).int().positive(),
  empaque: z.enum(TIPOS_EMPAQUE),
  unidadesPorEmpaque: enteroTexto("Unidades por empaque", { min: 1, max: 10_000 }),
  cantidadEmpaques: enteroTexto("La cantidad", { min: 1, max: 100_000 }),
  costoEmpaque: decimalTexto("El costo"),
});

export const compraSchema = z
  .object({
    id: z.number().int().positive().optional(),
    proveedorId: idRequerido("Selecciona el proveedor"),
    fechaPedido: fechaSchema("la fecha del pedido"),
    documentoProveedor: textoOpcional("El documento", 40),
    observaciones: textoOpcional("Las observaciones", 500),
    /** Registrar y recibir en un solo paso (la mercadería ya llegó) */
    recibirAhora: z.boolean(),
    detalles: z.array(detalleCompraSchema).min(1, "Agrega al menos un producto").max(100),
  })
  .superRefine((d, ctx) => {
    const vistos = new Set<number>();
    d.detalles.forEach((det, i) => {
      if (vistos.has(det.presentacionId)) {
        ctx.addIssue({
          code: "custom",
          path: ["detalles", i, "presentacionId"],
          message: "Producto repetido: suma la cantidad en una sola línea",
        });
      }
      vistos.add(det.presentacionId);
    });
  });

export type CompraInput = z.input<typeof compraSchema>;
export type CompraOutput = z.output<typeof compraSchema>;
export type DetalleCompraInput = z.input<typeof detalleCompraSchema>;

export const recepcionSchema = z
  .object({
    compraId: z.number().int().positive(),
    fechaRecepcion: fechaSchema("la fecha de recepción"),
    lineas: z
      .array(
        z.object({
          detalleId: z.number().int().positive(),
          cantidadRecibida: enteroTexto("La cantidad recibida", { max: 1_000_000 }),
        }),
      )
      .min(1),
  })
  .refine((d) => d.lineas.some((l) => l.cantidadRecibida > 0), {
    path: ["lineas"],
    message: "Debe llegar al menos una unidad. Si no llegó nada, anula el pedido.",
  });

export type RecepcionInput = z.input<typeof recepcionSchema>;
export type RecepcionOutput = z.output<typeof recepcionSchema>;

export const pagoCompraSchema = z.object({
  compraId: z.number().int().positive(),
  metodoPagoId: idRequerido("Selecciona el método de pago"),
  monto: decimalTexto("El monto").refine((v) => Number(v) > 0, "El monto debe ser mayor a 0"),
  referencia: textoOpcional("La referencia", 60),
  fecha: fechaSchema("la fecha del pago"),
});

export type PagoCompraInput = z.input<typeof pagoCompraSchema>;
export type PagoCompraOutput = z.output<typeof pagoCompraSchema>;

export const anularPagoCompraSchema = z.object({
  pagoId: z.number().int().positive(),
  motivo: textoRequerido("El motivo", 200),
});

export const anularCompraSchema = z.object({
  compraId: z.number().int().positive(),
  motivo: textoRequerido("El motivo", 200),
});

export const ESTADOS_FILTRO_COMPRA = ["PENDIENTE", "RECIBIDA", "ANULADA"] as const;
export const PAGOS_FILTRO_COMPRA = ["PENDIENTE", "PARCIAL", "PAGADO", "DEUDA"] as const;
