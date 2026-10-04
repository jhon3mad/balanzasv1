import { Badge } from "@/components/ui/badge";
import { ESTADO_ORDEN_LABELS, ESTADO_ORDEN_VARIANT, type EstadoOrden } from "../constants";

export function EstadoOrdenBadge({ estado }: { estado: EstadoOrden }) {
  return <Badge variant={ESTADO_ORDEN_VARIANT[estado]}>{ESTADO_ORDEN_LABELS[estado]}</Badge>;
}

export function VencidaBadge() {
  return (
    <Badge variant="destructive" title="La fecha prometida ya pasó">
      Vencida
    </Badge>
  );
}
