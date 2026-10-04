/** Helpers para leer searchParams de forma segura en Server Components. */

type Valor = string | string[] | undefined;

export function paramTexto(valor: Valor): string {
  return typeof valor === "string" ? valor.trim() : "";
}

export function paramPagina(valor: Valor): number {
  const n = Number(paramTexto(valor));
  return Number.isInteger(n) && n > 0 ? n : 1;
}

export function paramId(valor: Valor): number | undefined {
  const n = Number(paramTexto(valor));
  return Number.isInteger(n) && n > 0 ? n : undefined;
}

/** Devuelve el valor solo si pertenece a la lista permitida. */
export function paramEnum<T extends string>(valor: Valor, permitidos: readonly T[]): T | undefined {
  const v = paramTexto(valor);
  return (permitidos as readonly string[]).includes(v) ? (v as T) : undefined;
}
