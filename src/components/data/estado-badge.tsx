import { Badge } from "@/components/ui/badge";

export function EstadoBadge({ activo }: { activo: boolean }) {
  return <Badge variant={activo ? "outline" : "destructive"}>{activo ? "Activo" : "Inactivo"}</Badge>;
}
