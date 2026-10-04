import { decimalTextoOpcional, enteroTexto, textoOpcional, z } from "@/lib/validation";
import { MOTIVO_AJUSTE_INFO, MOTIVOS_AJUSTE } from "./constants";

export const lineaAjusteSchema = z.object({
  presentacionId: z.number().int().positive(),
  /** Solo en modo "libre": si la línea suma o resta */
  direccion: z.enum(["ENTRADA", "SALIDA"]),
  /** En conteo: stock contado. En los demás: unidades que entran o salen. */
  cantidad: enteroTexto("La cantidad", { max: 1_000_000 }),
  /** Costo unitario de las unidades que entran (opcional salvo inventario inicial) */
  costoUnitario: decimalTextoOpcional("El costo", { decimales: 4 }),
});

export const ajusteSchema = z
  .object({
    motivo: z.enum(MOTIVOS_AJUSTE, { error: "Selecciona el motivo" }),
    observacion: textoOpcional("La observación", 300),
    lineas: z.array(lineaAjusteSchema).min(1, "Agrega al menos un producto").max(200),
  })
  .superRefine((d, ctx) => {
    const modo = MOTIVO_AJUSTE_INFO[d.motivo].modo;
    const vistos = new Set<number>();
    d.lineas.forEach((l, i) => {
      if (vistos.has(l.presentacionId)) {
        ctx.addIssue({ code: "custom", path: ["lineas", i, "cantidad"], message: "Producto repetido" });
      }
      vistos.add(l.presentacionId);
      if (modo !== "conteo" && l.cantidad === 0) {
        ctx.addIssue({ code: "custom", path: ["lineas", i, "cantidad"], message: "Debe ser mayor a 0" });
      }
      if (modo === "entrada" && l.costoUnitario === null) {
        ctx.addIssue({ code: "custom", path: ["lineas", i, "costoUnitario"], message: "Indica el costo unitario" });
      }
    });
    if (d.motivo === "OTRO" && !d.observacion) {
      ctx.addIssue({ code: "custom", path: ["observacion"], message: "Explica el motivo del ajuste" });
    }
  });

export type AjusteInput = z.input<typeof ajusteSchema>;
export type AjusteOutput = z.output<typeof ajusteSchema>;
export type LineaAjusteInput = z.input<typeof lineaAjusteSchema>;
