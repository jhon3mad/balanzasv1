// Formatos de impresión según Configuracion.formatoTicket.

export type FormatoImpresion = "MM58" | "MM80" | "A4";

/** Regla @page para la impresora (térmica de 58/80 mm o A4). */
export const PAGINA: Record<FormatoImpresion, string> = {
  MM58: "@page { size: 58mm auto; margin: 3mm; }",
  MM80: "@page { size: 80mm auto; margin: 4mm; }",
  A4: "@page { size: A4; margin: 12mm; }",
};

/** Ancho y tamaño de letra del documento en pantalla y al imprimir. */
export const DOCUMENTO: Record<FormatoImpresion, string> = {
  MM58: "w-[50mm] text-[10px] leading-snug font-mono",
  MM80: "w-[72mm] text-[11px] leading-snug font-mono",
  A4: "w-full max-w-[186mm] text-sm leading-normal",
};

export const esTicket = (f: FormatoImpresion) => f !== "A4";
