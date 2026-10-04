import "server-only";
import ExcelJS from "exceljs";

export type FormatoColumna = "texto" | "entero" | "moneda" | "fecha" | "fechaHora";

export type Columna<T> = {
  titulo: string;
  valor: (fila: T) => string | number | Date | null;
  formato?: FormatoColumna;
  ancho?: number;
};

const FORMATO: Record<FormatoColumna, string | undefined> = {
  texto: undefined,
  entero: "#,##0",
  moneda: '"S/" #,##0.00',
  fecha: "dd/mm/yyyy",
  fechaHora: "dd/mm/yyyy hh:mm",
};

/** Lima es UTC−5 todo el año: Excel no maneja zonas, así que se escribe la hora local. */
const aHoraLima = (d: Date) => new Date(d.getTime() - 5 * 60 * 60 * 1000);

export function crearLibro(): ExcelJS.Workbook {
  const libro = new ExcelJS.Workbook();
  libro.creator = "Sistema de Ventas";
  libro.created = new Date();
  return libro;
}

/**
 * Agrega una hoja con encabezado en negrita, filtros, primera fila fija y,
 * opcionalmente, una fila de totales para las columnas indicadas.
 */
export function agregarHoja<T>(
  libro: ExcelJS.Workbook,
  nombre: string,
  columnas: Columna<T>[],
  filas: T[],
  opciones: { titulo?: string; totales?: string[] } = {},
) {
  const hoja = libro.addWorksheet(nombre.slice(0, 31));
  let inicio = 1;
  if (opciones.titulo) {
    hoja.getCell(1, 1).value = opciones.titulo;
    hoja.getCell(1, 1).font = { bold: true, size: 13 };
    inicio = 3;
  }

  const encabezado = hoja.getRow(inicio);
  columnas.forEach((c, i) => {
    const celda = encabezado.getCell(i + 1);
    celda.value = c.titulo;
    celda.font = { bold: true };
    celda.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFEDEDED" } };
    hoja.getColumn(i + 1).width = c.ancho ?? Math.max(12, c.titulo.length + 2);
    const formato = FORMATO[c.formato ?? "texto"];
    if (formato) hoja.getColumn(i + 1).numFmt = formato;
  });

  filas.forEach((fila, r) => {
    const row = hoja.getRow(inicio + 1 + r);
    columnas.forEach((c, i) => {
      const v = c.valor(fila);
      const numerico = c.formato === "moneda" || c.formato === "entero";
      row.getCell(i + 1).value = v instanceof Date ? aHoraLima(v) : numerico && v !== null ? Number(v) : v;
    });
  });

  if (opciones.totales?.length && filas.length) {
    const fin = inicio + filas.length;
    const row = hoja.getRow(fin + 1);
    row.getCell(1).value = "Total";
    row.font = { bold: true };
    columnas.forEach((c, i) => {
      if (!opciones.totales!.includes(c.titulo)) return;
      const col = hoja.getColumn(i + 1).letter;
      row.getCell(i + 1).value = { formula: `SUM(${col}${inicio + 1}:${col}${fin})` };
    });
  }

  hoja.views = [{ state: "frozen", ySplit: inicio }];
  if (filas.length) hoja.autoFilter = { from: { row: inicio, column: 1 }, to: { row: inicio + filas.length, column: columnas.length } };
  return hoja;
}

/** Respuesta HTTP que descarga el libro como .xlsx. */
export async function respuestaExcel(libro: ExcelJS.Workbook, archivo: string): Promise<Response> {
  const buffer = await libro.xlsx.writeBuffer();
  return new Response(buffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${archivo}.xlsx"`,
      "Cache-Control": "no-store",
    },
  });
}
