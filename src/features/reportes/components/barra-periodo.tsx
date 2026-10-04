import Link from "next/link";
import { FileSpreadsheetIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DateRangeFilter } from "@/components/data/date-range-filter";
import { hoyLima } from "@/lib/dates";
import { cn } from "@/lib/utils";
import { sumarDias, type Periodo } from "../periodo";

type Props = {
  ruta: string;
  periodo: Periodo;
  /** Otros parámetros de la URL que se conservan al cambiar de periodo */
  params: Record<string, string | string[] | undefined>;
  /** URL de descarga en Excel (sin el periodo) */
  excel?: string;
  /** Filtros adicionales (ej. vendedor) */
  children?: React.ReactNode;
};

const fmt = (f: string) => f.split("-").reverse().join("/");

function rangosRapidos() {
  const hoy = hoyLima();
  const inicioMes = `${hoy.slice(0, 8)}01`;
  const finMesAnterior = sumarDias(inicioMes, -1);
  // Semana de lunes a hoy
  const dia = new Date(`${hoy}T12:00:00Z`).getUTCDay();
  const lunes = sumarDias(hoy, -((dia + 6) % 7));
  return [
    { label: "Hoy", desde: hoy, hasta: hoy },
    { label: "Esta semana", desde: lunes, hasta: hoy },
    { label: "Este mes", desde: inicioMes, hasta: hoy },
    { label: "Mes anterior", desde: `${finMesAnterior.slice(0, 8)}01`, hasta: finMesAnterior },
    { label: "Este año", desde: `${hoy.slice(0, 4)}-01-01`, hasta: hoy },
  ];
}

/** Periodo del reporte: accesos rápidos, rango libre, filtros extra y exportar a Excel. */
export function BarraPeriodo({ ruta, periodo, params, excel, children }: Props) {
  const otros = Object.entries(params).flatMap(([k, v]) =>
    typeof v === "string" && k !== "desde" && k !== "hasta" && k !== "page" ? [[k, v] as [string, string]] : [],
  );
  const conPeriodo = (desde: string, hasta: string, base = ruta, extra = otros) =>
    `${base}?${new URLSearchParams([...extra, ["desde", desde], ["hasta", hasta]]).toString()}`;

  return (
    <div className="grid gap-3">
      <div className="flex flex-wrap items-center gap-1">
        {rangosRapidos().map((r) => {
          const activo = r.desde === periodo.desde && r.hasta === periodo.hasta;
          return (
            <Button
              key={r.label}
              size="sm"
              variant={activo ? "secondary" : "ghost"}
              className={cn(activo && "font-semibold")}
              nativeButton={false}
              render={<Link href={conPeriodo(r.desde, r.hasta)} />}
            >
              {r.label}
            </Button>
          );
        })}
      </div>
      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
        <DateRangeFilter />
        {children}
        <span className="text-sm text-muted-foreground">
          Del {fmt(periodo.desde)} al {fmt(periodo.hasta)}
        </span>
        {excel && (
          <Button
            variant="outline"
            className="sm:ml-auto"
            nativeButton={false}
            render={<a href={conPeriodo(periodo.desde, periodo.hasta, excel)} download />}
          >
            <FileSpreadsheetIcon />
            Exportar a Excel
          </Button>
        )}
      </div>
    </div>
  );
}
