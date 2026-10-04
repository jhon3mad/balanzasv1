// Etiquetas y estilos de estados compartidos (compras y ventas).

export const ESTADOS_PAGO = ["PENDIENTE", "PARCIAL", "PAGADO"] as const;
export type EstadoPago = (typeof ESTADOS_PAGO)[number];

export const ESTADO_PAGO_LABELS: Record<EstadoPago, string> = {
  PENDIENTE: "Sin pagar",
  PARCIAL: "Pago parcial",
  PAGADO: "Pagado",
};

export const ESTADO_PAGO_VARIANT: Record<EstadoPago, "destructive" | "secondary" | "outline"> = {
  PENDIENTE: "destructive",
  PARCIAL: "secondary",
  PAGADO: "outline",
};

/** Deriva el estado de pago a partir del total y lo pagado (en céntimos para evitar errores de redondeo). */
export function estadoPagoDe(total: number | string, pagado: number | string): EstadoPago {
  const t = Math.round(Number(total) * 100);
  const p = Math.round(Number(pagado) * 100);
  if (p >= t) return "PAGADO";
  if (p > 0) return "PARCIAL";
  return "PENDIENTE";
}
