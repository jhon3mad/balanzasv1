// Monto en letras para comprobantes: "SON: CIENTO VEINTE CON 50/100 SOLES".

const UNIDADES = ["", "UNO", "DOS", "TRES", "CUATRO", "CINCO", "SEIS", "SIETE", "OCHO", "NUEVE"];
const ESPECIALES = [
  "DIEZ", "ONCE", "DOCE", "TRECE", "CATORCE", "QUINCE", "DIECISÉIS", "DIECISIETE", "DIECIOCHO", "DIECINUEVE",
  "VEINTE", "VEINTIUNO", "VEINTIDÓS", "VEINTITRÉS", "VEINTICUATRO", "VEINTICINCO", "VEINTISÉIS", "VEINTISIETE",
  "VEINTIOCHO", "VEINTINUEVE",
];
const DECENAS = ["", "", "", "TREINTA", "CUARENTA", "CINCUENTA", "SESENTA", "SETENTA", "OCHENTA", "NOVENTA"];
const CENTENAS = [
  "", "CIENTO", "DOSCIENTOS", "TRESCIENTOS", "CUATROCIENTOS", "QUINIENTOS", "SEISCIENTOS", "SETECIENTOS",
  "OCHOCIENTOS", "NOVECIENTOS",
];

/** 0–999 en letras. */
function centenas(n: number): string {
  if (n === 100) return "CIEN";
  const c = Math.floor(n / 100);
  const resto = n % 100;
  let texto = CENTENAS[c]!;
  if (resto > 0) {
    let dec: string;
    if (resto < 10) dec = UNIDADES[resto]!;
    else if (resto < 30) dec = ESPECIALES[resto - 10]!;
    else {
      const u = resto % 10;
      dec = DECENAS[Math.floor(resto / 10)]! + (u ? ` Y ${UNIDADES[u]}` : "");
    }
    texto = texto ? `${texto} ${dec}` : dec;
  }
  return texto;
}

/** "UNO" → "UN" y "VEINTIUNO" → "VEINTIÚN" delante de MIL / MILLONES. */
const apocope = (t: string) => t.replace(/VEINTIUNO$/, "VEINTIÚN").replace(/UNO$/, "UN");

/** Entero (hasta 999 999 999) en letras. */
export function enteroEnLetras(n: number): string {
  if (n === 0) return "CERO";
  const millones = Math.floor(n / 1_000_000);
  const miles = Math.floor((n % 1_000_000) / 1000);
  const resto = n % 1000;
  const partes: string[] = [];
  if (millones) partes.push(millones === 1 ? "UN MILLÓN" : `${apocope(centenas(millones))} MILLONES`);
  if (miles) partes.push(miles === 1 ? "MIL" : `${apocope(centenas(miles))} MIL`);
  if (resto) partes.push(centenas(resto));
  return partes.join(" ");
}

/** "120.5" → "SON: CIENTO VEINTE CON 50/100 SOLES" */
export function montoEnLetras(monto: string | number): string {
  const centimos = Math.round(Number(monto) * 100);
  const soles = Math.floor(centimos / 100);
  const cent = String(centimos % 100).padStart(2, "0");
  return `SON: ${enteroEnLetras(soles)} CON ${cent}/100 ${soles === 1 && cent === "00" ? "SOL" : "SOLES"}`;
}
