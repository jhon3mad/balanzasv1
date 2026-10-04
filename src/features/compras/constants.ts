export const TIPOS_EMPAQUE = ["UNIDAD", "CAJA", "DECENA", "DOCENA", "CIENTO"] as const;
export type TipoEmpaque = (typeof TIPOS_EMPAQUE)[number];

export const EMPAQUE_LABELS: Record<TipoEmpaque, { singular: string; plural: string }> = {
  UNIDAD: { singular: "unidad", plural: "unidades" },
  CAJA: { singular: "caja", plural: "cajas" },
  DECENA: { singular: "decena", plural: "decenas" },
  DOCENA: { singular: "docena", plural: "docenas" },
  CIENTO: { singular: "ciento", plural: "cientos" },
};

/** Unidades fijas por empaque (la caja depende del producto). */
export const UNIDADES_EMPAQUE: Record<TipoEmpaque, number | null> = {
  UNIDAD: 1,
  CAJA: null,
  DECENA: 10,
  DOCENA: 12,
  CIENTO: 100,
};

export const ESTADOS_COMPRA = ["PENDIENTE", "RECIBIDA", "ANULADA"] as const;
export type EstadoCompra = (typeof ESTADOS_COMPRA)[number];

export const ESTADO_COMPRA_LABELS: Record<EstadoCompra, string> = {
  PENDIENTE: "Pedido pendiente",
  RECIBIDA: "Recibida",
  ANULADA: "Anulada",
};

export const ESTADO_COMPRA_VARIANT: Record<EstadoCompra, "secondary" | "outline" | "destructive"> = {
  PENDIENTE: "secondary",
  RECIBIDA: "outline",
  ANULADA: "destructive",
};

/** "2 cajas × 4" / "10 unidades" */
export function describirEmpaque(empaque: TipoEmpaque, cantidad: number, unidadesPorEmpaque: number): string {
  const nombre = cantidad === 1 ? EMPAQUE_LABELS[empaque].singular : EMPAQUE_LABELS[empaque].plural;
  return empaque === "UNIDAD" ? `${cantidad} ${nombre}` : `${cantidad} ${nombre} × ${unidadesPorEmpaque}`;
}
