export const ESTADOS_ORDEN = ["RECIBIDO", "EN_DIAGNOSTICO", "EN_REPARACION", "LISTO", "ENTREGADO", "CANCELADO"] as const;
export type EstadoOrden = (typeof ESTADOS_ORDEN)[number];

export const ESTADO_ORDEN_LABELS: Record<EstadoOrden, string> = {
  RECIBIDO: "Recibido",
  EN_DIAGNOSTICO: "En diagnóstico",
  EN_REPARACION: "En reparación",
  LISTO: "Listo para entregar",
  ENTREGADO: "Entregado",
  CANCELADO: "Cancelado",
};

export const ESTADO_ORDEN_VARIANT: Record<EstadoOrden, "default" | "secondary" | "outline" | "destructive"> = {
  RECIBIDO: "secondary",
  EN_DIAGNOSTICO: "secondary",
  EN_REPARACION: "secondary",
  LISTO: "default",
  ENTREGADO: "outline",
  CANCELADO: "destructive",
};

/** Estados del taller, en orden. ENTREGADO y CANCELADO son finales y tienen su propia acción. */
export const FLUJO_ORDEN = ["RECIBIDO", "EN_DIAGNOSTICO", "EN_REPARACION", "LISTO"] as const satisfies readonly EstadoOrden[];
export type EstadoTaller = (typeof FLUJO_ORDEN)[number];

export const ESTADOS_FINALES: readonly EstadoOrden[] = ["ENTREGADO", "CANCELADO"];

export function esFinal(estado: EstadoOrden): boolean {
  return ESTADOS_FINALES.includes(estado);
}

/**
 * A qué estados del taller se puede pasar: hacia adelante a cualquiera
 * (ej. una calibración pasa directo a "listo") o un solo paso atrás (la falla persiste).
 */
export function estadosPermitidos(actual: EstadoOrden): EstadoTaller[] {
  const i = (FLUJO_ORDEN as readonly EstadoOrden[]).indexOf(actual);
  if (i < 0) return [];
  return FLUJO_ORDEN.filter((_, j) => j > i || j === i - 1);
}
