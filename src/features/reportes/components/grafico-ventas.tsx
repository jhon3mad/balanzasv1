"use client";

import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { ChartContainer, ChartTooltip, type ChartConfig } from "@/components/ui/chart";
import { formatPEN } from "@/lib/money";
import { cn } from "@/lib/utils";
import type { PuntoVentas } from "../queries";

// Una sola serie: no lleva leyenda (el título del gráfico dice qué se grafica).
const config = { total: { label: "Vendido", color: "var(--chart-3)" } } satisfies ChartConfig;

const MESES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];

/** "2026-10-04" → "4 oct" · "2026-10" → "oct 2026" */
function etiqueta(clave: string, largo = false) {
  const [a, m, d] = clave.split("-");
  const mes = MESES[Number(m) - 1];
  if (!d) return `${mes} ${a}`;
  return largo ? `${Number(d)} ${mes} ${a}` : `${Number(d)} ${mes}`;
}

const compacto = new Intl.NumberFormat("es-PE", { notation: "compact", maximumFractionDigits: 1 });

type Props = { puntos: PuntoVentas[]; className?: string };

/** Columnas de lo vendido por día (o por mes), con tooltip al pasar el mouse. */
export function GraficoVentas({ puntos, className }: Props) {
  const datos = puntos.map((p) => ({ ...p, total: Number(p.total) }));

  return (
    <ChartContainer config={config} className={cn("aspect-auto h-64 w-full", className)}>
      <BarChart data={datos} margin={{ top: 8, right: 4, left: 4, bottom: 0 }}>
        <CartesianGrid vertical={false} stroke="var(--border)" strokeWidth={1} />
        <XAxis
          dataKey="clave"
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          minTickGap={16}
          tickFormatter={(v: string) => etiqueta(v)}
        />
        <YAxis
          width={52}
          tickLine={false}
          axisLine={false}
          tickFormatter={(v: number) => `S/ ${compacto.format(v)}`}
          allowDecimals={false}
        />
        <ChartTooltip
          cursor={{ fill: "var(--muted)", opacity: 0.6 }}
          content={({ active, payload }) => {
            const p = payload?.[0]?.payload as (typeof datos)[number] | undefined;
            if (!active || !p) return null;
            return (
              <div className="grid min-w-36 gap-1 rounded-lg border bg-background px-3 py-2 text-xs shadow-md">
                <div className="font-medium">{etiqueta(p.clave, true)}</div>
                <div className="flex items-center justify-between gap-4">
                  <span className="flex items-center gap-1.5 text-muted-foreground">
                    <span className="size-2 rounded-[2px] bg-(--color-total)" />
                    Vendido
                  </span>
                  <span className="font-medium tabular-nums">{formatPEN(p.total)}</span>
                </div>
                <div className="flex justify-between gap-4 text-muted-foreground">
                  <span>Boletas</span>
                  <span className="tabular-nums">{p.ventas}</span>
                </div>
              </div>
            );
          }}
        />
        <Bar dataKey="total" fill="var(--color-total)" radius={[4, 4, 0, 0]} maxBarSize={24} />
      </BarChart>
    </ChartContainer>
  );
}
