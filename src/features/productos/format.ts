import { formatNumero } from "@/lib/money";
import {
  FUNCIONAMIENTO_LABELS,
  TIPO_ENCHUFE_LABELS,
  TIPO_PRODUCTO_LABELS,
  type Funcionamiento,
  type TipoEnchufe,
  type TipoProducto,
} from "./constants";

type Caracteristicas = {
  tipo: TipoProducto;
  uso?: string | null;
  forma?: string | null;
  funcionamiento?: Funcionamiento | null;
  capacidadKg?: string | null;
  precisionG?: string | null;
  voltaje?: string | null;
  tipoEnchufe?: TipoEnchufe | null;
};

/** Ej. "Comercial · Mostrador · Digital · 40 kg · 5 g" */
export function resumenCaracteristicas(p: Caracteristicas): string {
  const partes: string[] = [];
  if (p.uso) partes.push(p.uso);
  if (p.forma) partes.push(p.forma);
  if (p.funcionamiento) partes.push(FUNCIONAMIENTO_LABELS[p.funcionamiento]);
  if (p.capacidadKg) partes.push(`${formatNumero(p.capacidadKg)} kg`);
  if (p.precisionG) partes.push(`precisión ${formatNumero(p.precisionG)} g`);
  if (p.voltaje) partes.push(`${formatNumero(p.voltaje)} V`);
  if (p.tipoEnchufe) partes.push(`Entrada ${TIPO_ENCHUFE_LABELS[p.tipoEnchufe].toLowerCase()}`);
  return partes.join(" · ");
}

/** Nombre sugerido a partir de las características: "Balanza Kambor 40 kg Mostrador" */
export function sugerirNombre(p: Caracteristicas & { marca?: string | null; modelo?: string | null }): string {
  const partes: string[] = [TIPO_PRODUCTO_LABELS[p.tipo]];
  if (p.tipo === "ENCHUFE" && p.tipoEnchufe) partes.push(TIPO_ENCHUFE_LABELS[p.tipoEnchufe].toLowerCase());
  if (p.marca) partes.push(p.marca);
  if (p.modelo) partes.push(p.modelo);
  if (p.voltaje) partes.push(`${formatNumero(p.voltaje)}V`);
  if (p.capacidadKg) partes.push(`${formatNumero(p.capacidadKg)} kg`);
  if (p.forma) partes.push(p.forma.toLowerCase());
  return partes.join(" ");
}
