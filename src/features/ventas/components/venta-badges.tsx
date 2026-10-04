import { Badge } from "@/components/ui/badge";
import {
  ESTADO_ENTREGA_LABELS,
  ESTADO_ENTREGA_VARIANT,
  ESTADO_VENTA_LABELS,
  ESTADO_VENTA_VARIANT,
  type EstadoEntrega,
  type EstadoVenta,
} from "../constants";

export { EstadoPagoBadge } from "@/features/compras/components/compra-badges";

export function EstadoVentaBadge({ estado }: { estado: EstadoVenta }) {
  return <Badge variant={ESTADO_VENTA_VARIANT[estado]}>{ESTADO_VENTA_LABELS[estado]}</Badge>;
}

export function EstadoEntregaBadge({ estado }: { estado: EstadoEntrega }) {
  return <Badge variant={ESTADO_ENTREGA_VARIANT[estado]}>{ESTADO_ENTREGA_LABELS[estado]}</Badge>;
}
