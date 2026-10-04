export const ESTADOS_VENTA = ["ABIERTA", "EMITIDA", "ANULADA"] as const;
export type EstadoVenta = (typeof ESTADOS_VENTA)[number];

export const ESTADO_VENTA_LABELS: Record<EstadoVenta, string> = {
  ABIERTA: "Abierta",
  EMITIDA: "Emitida",
  ANULADA: "Anulada",
};

export const ESTADO_VENTA_VARIANT: Record<EstadoVenta, "secondary" | "outline" | "destructive"> = {
  ABIERTA: "secondary",
  EMITIDA: "outline",
  ANULADA: "destructive",
};

export const ESTADOS_ENTREGA = ["PENDIENTE", "ENTREGADO"] as const;
export type EstadoEntrega = (typeof ESTADOS_ENTREGA)[number];

export const ESTADO_ENTREGA_LABELS: Record<EstadoEntrega, string> = {
  PENDIENTE: "Por entregar",
  ENTREGADO: "Entregado",
};

export const ESTADO_ENTREGA_VARIANT: Record<EstadoEntrega, "secondary" | "outline"> = {
  PENDIENTE: "secondary",
  ENTREGADO: "outline",
};

/** Tramos de antigüedad de las cuentas por cobrar (días desde la emisión). */
export const TRAMOS_ANTIGUEDAD = [
  { clave: "d30", label: "0–30 días", hasta: 30 },
  { clave: "d60", label: "31–60 días", hasta: 60 },
  { clave: "d90", label: "61–90 días", hasta: 90 },
  { clave: "mas", label: "Más de 90 días", hasta: Infinity },
] as const;

export type TramoAntiguedad = (typeof TRAMOS_ANTIGUEDAD)[number]["clave"];
