// Constantes compartidas cliente/servidor (deben coincidir con los enums de Prisma).

export const TIPOS_PRODUCTO = ["BALANZA", "BATERIA", "ENCHUFE", "SENSOR", "TARJETA", "REPUESTO", "OTRO"] as const;
export type TipoProducto = (typeof TIPOS_PRODUCTO)[number];

export const TIPO_PRODUCTO_LABELS: Record<TipoProducto, string> = {
  BALANZA: "Balanza",
  BATERIA: "Batería",
  ENCHUFE: "Enchufe",
  SENSOR: "Sensor",
  TARJETA: "Tarjeta",
  REPUESTO: "Repuesto",
  OTRO: "Otro",
};

export const FUNCIONAMIENTOS = ["DIGITAL", "MECANICA_RELOJ", "MECANICA_ROMANA"] as const;
export type Funcionamiento = (typeof FUNCIONAMIENTOS)[number];

export const FUNCIONAMIENTO_LABELS: Record<Funcionamiento, string> = {
  DIGITAL: "Digital",
  MECANICA_RELOJ: "Mecánica (de reloj)",
  MECANICA_ROMANA: "Mecánica (romana)",
};

export const TIPOS_ENCHUFE = ["PUNTA", "TRIANGULAR"] as const;
export type TipoEnchufe = (typeof TIPOS_ENCHUFE)[number];

export const TIPO_ENCHUFE_LABELS: Record<TipoEnchufe, string> = {
  PUNTA: "De punta",
  TRIANGULAR: "Triangular",
};

/** Qué características aplica cada tipo de producto. */
export const CAMPOS_POR_TIPO: Record<
  TipoProducto,
  { marca: "requerida" | "opcional" | "no"; balanza: boolean; capacidad: boolean; voltaje: boolean; enchufe: boolean }
> = {
  BALANZA: { marca: "requerida", balanza: true, capacidad: true, voltaje: false, enchufe: false },
  BATERIA: { marca: "requerida", balanza: false, capacidad: false, voltaje: true, enchufe: false },
  ENCHUFE: { marca: "no", balanza: false, capacidad: false, voltaje: false, enchufe: true },
  SENSOR: { marca: "opcional", balanza: false, capacidad: true, voltaje: false, enchufe: false },
  TARJETA: { marca: "opcional", balanza: false, capacidad: false, voltaje: false, enchufe: false },
  REPUESTO: { marca: "opcional", balanza: false, capacidad: false, voltaje: false, enchufe: false },
  OTRO: { marca: "opcional", balanza: false, capacidad: false, voltaje: false, enchufe: false },
};

/** Prefijo para generar códigos cuando el producto no trae uno de fábrica. */
export const PREFIJO_CODIGO: Record<TipoProducto, string> = {
  BALANZA: "BAL",
  BATERIA: "BAT",
  ENCHUFE: "ENC",
  SENSOR: "SEN",
  TARJETA: "TAR",
  REPUESTO: "REP",
  OTRO: "PRO",
};

export const ESTADOS_FILTRO = ["activos", "inactivos", "todos"] as const;
export type EstadoFiltro = (typeof ESTADOS_FILTRO)[number];
