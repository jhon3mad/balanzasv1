import { decimalTexto, decimalTextoOpcional, enteroTexto, textoOpcional, textoRequerido, z } from "@/lib/validation";

export const itemVentaSchema = z.object({
  presentacionId: z.number().int().positive(),
  cantidad: enteroTexto("La cantidad", { min: 1, max: 10_000 }),
  precioUnitario: decimalTexto("El precio"),
});

export const pagoVentaSchema = z.object({
  metodoPagoId: z.number({ error: "Selecciona el método de pago" }).int().positive(),
  monto: decimalTexto("El monto").refine((v) => Number(v) > 0, "El monto debe ser mayor a 0"),
  /** Solo efectivo: lo que entregó el cliente (para el vuelto) */
  montoRecibido: decimalTextoOpcional("El monto recibido"),
  referencia: textoOpcional("El n° de operación", 60),
});

export const ventaSchema = z
  .object({
    clienteId: z.number().int().positive().nullable(),
    /** Se entrega el producto en el acto */
    entregado: z.boolean(),
    observaciones: textoOpcional("Las observaciones", 300),
    items: z.array(itemVentaSchema).min(1, "Agrega al menos un producto").max(100),
    /** Vacío = venta al crédito */
    pagos: z.array(pagoVentaSchema).max(10),
  })
  .superRefine((d, ctx) => {
    const vistos = new Set<number>();
    d.items.forEach((it, i) => {
      if (vistos.has(it.presentacionId)) {
        ctx.addIssue({ code: "custom", path: ["items", i, "cantidad"], message: "Producto repetido" });
      }
      vistos.add(it.presentacionId);
    });
    d.pagos.forEach((p, i) => {
      if (p.montoRecibido !== null && Number(p.montoRecibido) < Number(p.monto)) {
        ctx.addIssue({
          code: "custom",
          path: ["pagos", i, "montoRecibido"],
          message: "Lo recibido no puede ser menor al monto",
        });
      }
    });
  });

export type VentaInput = z.input<typeof ventaSchema>;
export type VentaOutput = z.output<typeof ventaSchema>;

/** Cobro de saldo después de emitida la venta (pago parcial o total). */
export const cobroSchema = z
  .object({
    ventaId: z.number().int().positive(),
    metodoPagoId: z.string().regex(/^\d+$/, "Selecciona el método de pago").transform(Number),
    monto: decimalTexto("El monto").refine((v) => Number(v) > 0, "El monto debe ser mayor a 0"),
    montoRecibido: decimalTextoOpcional("El monto recibido"),
    referencia: textoOpcional("El n° de operación", 60),
  })
  .refine((d) => d.montoRecibido === null || Number(d.montoRecibido) >= Number(d.monto), {
    path: ["montoRecibido"],
    message: "Lo recibido no puede ser menor al monto",
  });

export type CobroInput = z.input<typeof cobroSchema>;
export type CobroOutput = z.output<typeof cobroSchema>;

export const ventaIdSchema = z.object({ ventaId: z.number().int().positive() });

export const anularVentaSchema = z.object({
  ventaId: z.number().int().positive(),
  motivo: textoRequerido("El motivo", 200),
});

export const anularPagoVentaSchema = z.object({
  pagoId: z.number().int().positive(),
  motivo: textoRequerido("El motivo", 200),
});

/** null = Cliente general */
export const cambiarClienteVentaSchema = z.object({
  ventaId: z.number().int().positive(),
  clienteId: z.number().int().positive().nullable(),
});

export const ESTADOS_FILTRO_VENTA = ["EMITIDA", "ANULADA"] as const;
export const PAGOS_FILTRO_VENTA = ["DEUDA", "PENDIENTE", "PARCIAL", "PAGADO"] as const;
export const ENTREGAS_FILTRO_VENTA = ["PENDIENTE", "ENTREGADO"] as const;
