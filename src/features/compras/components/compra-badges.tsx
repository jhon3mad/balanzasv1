import { Badge } from "@/components/ui/badge";
import { ESTADO_PAGO_LABELS, ESTADO_PAGO_VARIANT, type EstadoPago } from "@/lib/estados";
import { ESTADO_COMPRA_LABELS, ESTADO_COMPRA_VARIANT, type EstadoCompra } from "../constants";

export function EstadoCompraBadge({ estado }: { estado: EstadoCompra }) {
  return <Badge variant={ESTADO_COMPRA_VARIANT[estado]}>{ESTADO_COMPRA_LABELS[estado]}</Badge>;
}

export function EstadoPagoBadge({ estado }: { estado: EstadoPago }) {
  return <Badge variant={ESTADO_PAGO_VARIANT[estado]}>{ESTADO_PAGO_LABELS[estado]}</Badge>;
}
