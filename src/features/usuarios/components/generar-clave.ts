const CARACTERES = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789";

/** Contraseña temporal legible (sin 0/O, 1/l/I para evitar confusiones). */
export function generarClaveTemporal(longitud = 10): string {
  const valores = crypto.getRandomValues(new Uint32Array(longitud));
  return Array.from(valores, (v) => CARACTERES[v % CARACTERES.length]).join("");
}
