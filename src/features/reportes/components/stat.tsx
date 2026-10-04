import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type Props = {
  label: string;
  valor: string;
  detalle?: React.ReactNode;
  href?: string;
  /** Resalta el valor (ej. saldos vencidos) */
  alerta?: boolean;
};

/** Indicador: etiqueta, valor y detalle opcional. Si tiene href, toda la tarjeta es un enlace. */
export function Stat({ label, valor, detalle, href, alerta }: Props) {
  const tarjeta = (
    <Card size="sm" className={cn("h-full", href && "transition-colors hover:bg-muted/40")}>
      <CardContent>
        <div className="text-xs text-muted-foreground">{label}</div>
        <div className={cn("text-xl font-semibold", alerta && "text-destructive")}>{valor}</div>
        {detalle && <div className="text-xs text-muted-foreground">{detalle}</div>}
      </CardContent>
    </Card>
  );
  return href ? (
    <Link href={href} className="rounded-xl outline-none focus-visible:ring-3 focus-visible:ring-ring/50">
      {tarjeta}
    </Link>
  ) : (
    tarjeta
  );
}
