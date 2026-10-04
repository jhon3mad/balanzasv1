import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { FilterSelect } from "@/components/data/filter-select";
import { formatPEN } from "@/lib/money";
import { paramEnum, paramTexto } from "@/lib/search-params";
import { requireSession } from "@/lib/session";
import { alcanceReportes } from "@/features/reportes/permisos";
import { periodoDe } from "@/features/reportes/periodo";
import { masVendidos } from "@/features/reportes/queries";
import { BarraPeriodo } from "@/features/reportes/components/barra-periodo";

export const metadata: Metadata = { title: "Más vendidos" };

const ORDENES = ["importe", "cantidad"] as const;

export default async function MasVendidosPage({ searchParams }: PageProps<"/reportes/productos">) {
  const session = await requireSession();
  const a = alcanceReportes(session.user.role);
  if (!a.ventas) redirect("/sin-permiso");
  const sp = await searchParams;
  const p = periodoDe(paramTexto(sp.desde), paramTexto(sp.hasta));
  const orden = paramEnum(sp.orden, ORDENES) ?? "importe";
  const filas = await masVendidos(p, orden);
  const maximo = Math.max(...filas.map((f) => (orden === "cantidad" ? f.cantidad : Number(f.total))), 0);

  return (
    <>
      <BarraPeriodo ruta="/reportes/productos" periodo={p} params={sp} excel="/api/reportes/productos">
        <FilterSelect
          param="orden"
          opciones={[{ value: "cantidad", label: "Por unidades" }]}
          todos="Por importe"
        />
      </BarraPeriodo>

      <Card>
        <CardHeader>
          <CardTitle>Los 50 más vendidos</CardTitle>
          <CardDescription>Productos y servicios de boletas emitidas, sin anuladas.</CardDescription>
        </CardHeader>
        <CardContent className="px-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10 pl-6">#</TableHead>
                <TableHead>Producto / servicio</TableHead>
                <TableHead className="text-right">Unidades</TableHead>
                <TableHead className="text-right">Boletas</TableHead>
                <TableHead className="text-right">Importe</TableHead>
                {a.utilidad && <TableHead className="text-right">Utilidad</TableHead>}
                <TableHead className="w-32 pr-6" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {filas.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                    No hay ventas en este periodo.
                  </TableCell>
                </TableRow>
              )}
              {filas.map((f, i) => {
                const valor = orden === "cantidad" ? f.cantidad : Number(f.total);
                return (
                  <TableRow key={`${f.tipo}-${f.codigo ?? f.descripcion}`}>
                    <TableCell className="pl-6 text-muted-foreground tabular-nums">{i + 1}</TableCell>
                    <TableCell className="max-w-md whitespace-normal">
                      <div className="flex items-center gap-2 font-medium">
                        {f.descripcion}
                        {f.tipo === "SERVICIO" && <Badge variant="secondary">Servicio</Badge>}
                      </div>
                      {f.codigo && <div className="font-mono text-xs text-muted-foreground">{f.codigo}</div>}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{f.cantidad}</TableCell>
                    <TableCell className="text-right tabular-nums">{f.ventas}</TableCell>
                    <TableCell className="text-right tabular-nums">{formatPEN(f.total)}</TableCell>
                    {a.utilidad && (
                      <TableCell className="text-right tabular-nums">{formatPEN(Number(f.total) - Number(f.costo))}</TableCell>
                    )}
                    <TableCell className="pr-6">
                      <div className="h-1.5 rounded-full bg-muted">
                        <div className="h-full rounded-full bg-(--chart-3)" style={{ width: `${maximo ? (valor / maximo) * 100 : 0}%` }} />
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </>
  );
}
