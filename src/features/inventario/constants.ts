export const MOTIVOS_AJUSTE = [
  "CONTEO",
  "MERMA",
  "ROTURA",
  "DEVOLUCION_PROVEEDOR",
  "USO_INTERNO",
  "INVENTARIO_INICIAL",
  "OTRO",
] as const;
export type MotivoAjuste = (typeof MOTIVOS_AJUSTE)[number];

/** Cómo se indican las cantidades según el motivo. */
export type ModoAjuste = "conteo" | "salida" | "entrada" | "libre";

export const MOTIVO_AJUSTE_INFO: Record<MotivoAjuste, { label: string; modo: ModoAjuste; ayuda: string }> = {
  CONTEO: {
    label: "Conteo físico",
    modo: "conteo",
    ayuda: "Ingresa lo que contaste; el sistema calcula la diferencia con el stock registrado.",
  },
  MERMA: { label: "Merma / pérdida", modo: "salida", ayuda: "Unidades perdidas o extraviadas." },
  ROTURA: { label: "Rotura / dañado", modo: "salida", ayuda: "Unidades dañadas que ya no se pueden vender." },
  DEVOLUCION_PROVEEDOR: {
    label: "Devolución al proveedor",
    modo: "salida",
    ayuda: "Unidades devueltas fuera de una compra (si es toda la compra, anúlala).",
  },
  USO_INTERNO: { label: "Uso interno / reparaciones", modo: "salida", ayuda: "Unidades que usa la tienda." },
  INVENTARIO_INICIAL: {
    label: "Inventario inicial",
    modo: "entrada",
    ayuda: "Stock que ya tenías antes de usar el sistema. Indica su costo para calcular el costo promedio.",
  },
  OTRO: { label: "Otro", modo: "libre", ayuda: "Indica si es entrada o salida y explica en la observación." },
};

export const TIPOS_MOVIMIENTO = [
  "INVENTARIO_INICIAL",
  "COMPRA",
  "ANULACION_COMPRA",
  "VENTA",
  "ANULACION_VENTA",
  "AJUSTE_ENTRADA",
  "AJUSTE_SALIDA",
] as const;
export type TipoMovimiento = (typeof TIPOS_MOVIMIENTO)[number];

export const TIPO_MOVIMIENTO_LABELS: Record<TipoMovimiento, string> = {
  INVENTARIO_INICIAL: "Inventario inicial",
  COMPRA: "Compra",
  ANULACION_COMPRA: "Anulación de compra",
  VENTA: "Venta",
  ANULACION_VENTA: "Anulación de venta",
  AJUSTE_ENTRADA: "Ajuste (entrada)",
  AJUSTE_SALIDA: "Ajuste (salida)",
};

export const ESTADOS_STOCK = ["bajo", "agotado", "con-stock"] as const;
export type EstadoStock = (typeof ESTADOS_STOCK)[number];
