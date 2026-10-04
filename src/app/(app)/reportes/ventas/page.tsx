import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { FilterSelect } from "@/components/data/filter-select";
import { formatPEN } from "@/lib/money";
import { paramTexto } from "@/lib/search-params";
import { requireSession } from "@/lib/session";
import { opcionesVendedores } from "@/features/ventas/queries";
import { alcanceReportes } from "@/features/reportes/permisos";
import { periodoDe } from "@/features/reportes/periodo";
import { cobrosPorMetodo, resumenVentas, ventasEnElTiempo, ventasPorVendedor } from "@/features/reportes/queries";
import { BarraPeriodo } from "@/features/reportes/components/barra-periodo";
import { GraficoVentas } from "@/features/reportes/components/grafico-ventas";
import { Stat } from "@/features/reportes/components/stat";

export const metadata: Metadata = { title: "Reporte de ventas" };

const pct = (parte: number, total: number) => (total > 0 ? `${((parte / total) * 100).toFixed(1)}%` : "—");

export default async function ReporteVentasPage({ searchParams }: PageProps<"/reportes/ventas">) {
  const session = await requireSession();
  const a = alcanceReportes(session.user.role);
  if (!a.ventas && !a.soloPropias) redirect("/sin-permiso");
  const sp = await searchParams;
  const p = periodoDe(paramTexto(sp.desde), paramTexto(sp.hasta));

  const vendedores = a.ventas ? await opcionesVendedores() : [];
  const vendedorParam = paramTexto(sp.vendedor);
  // El vendedor solo ve lo suyo; el admin puede filtrar por vendedor
  const vendedorId = a.soloPropias ? session.user.id : vendedores.some((v) => v.value === vendedorParam) ? vendedorParam : undefined;

  const [resumen, tiempo, metodos, porVendedor] = await Promise.all([
    resumenVentas(p, vendedorId),
    ventasEnElTiempo(p, vendedorId),
    cobrosPorMetodo(p, vendedorId),
    a.ventas && !vendedorId ? ventasPorVendedor(p) : Promise.resolve([]),
  ]);

  const total = Number(resumen.total);
  const utilidad = total - Number(resumen.costo);
  const cobrado = Number(resumen.cobrado);
  const conVentas = resumen.ventas > 0;

  return (
    <>
      <BarraPeriodo ruta="/reportes/ventas" periodo={p} params={sp} excel="/api/reportes/ventas">
        {a.ventas && <FilterSelect param="vendedor" opciones={vendedores} todos="Todos los vendedores" />}
      </BarraPeriodo>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Total vendido" valor={formatPEN(resumen.total)} detalle={`${resumen.ventas} ${resumen.ventas === 1 ? "boleta" : "boletas"}`} />
        <Stat
          label="Ticket promedio"
          valor={conVentas ? formatPEN(total / resumen.ventas) : "—"}
          detalle={Number(resumen.descuento) > 0 ? `Descuentos: ${formatPEN(resumen.descuento)}` : undefined}
        />
        <Stat label={a.soloPropias ? "Lo que cobré" : "Dinero recibido"} valor={formatPEN(resumen.cobrado)} detalle="incluye saldos y adelantos" />
        {a.utilidad ? (
          <Stat label="Utilidad" valor={formatPEN(utilidad)} detalle={`Margen ${pct(utilidad, total)} · costo ${formatPEN(resumen.costo)}`} />
        ) : (
          <Stat label="Saldo por cobrar" valor={formatPEN(resumen.saldo)} detalle="de estas ventas" />
        )}
      </div>
      {resumen.anuladas > 0 && (
        <p className="-mt-3 text-xs text-muted-foreground">
          No incluye {resumen.anuladas} {resumen.anuladas === 1 ? "boleta anulada" : "boletas anuladas"} en el periodo.
        </p>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Vendido por {tiempo.agrupacion === "dia" ? "día" : "mes"}</CardTitle>
          <CardDescription>Boletas emitidas, sin anuladas.</CardDescription>
        </CardHeader>
        <CardContent>
          {conVentas ? (
            <GraficoVentas puntos={tiempo.puntos} />
          ) : (
            <p className="py-12 text-center text-sm text-muted-foreground">No hay ventas en este periodo.</p>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Dinero recibido por método</CardTitle>
            <CardDescription>Pagos registrados en el periodo, sin anulados.</CardDescription>
          </CardHeader>
          <CardContent className="px-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-6">Método</TableHead>
                  <TableHead className="text-right">Pagos</TableHead>
                  <TableHead className="text-right">Monto</TableHead>
                  <TableHead className="w-32 pr-6">Parte</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {metodos.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="h-16 text-center text-muted-foreground">
                      Sin pagos en el periodo.
                    </TableCell>
                  </TableRow>
                )}
                {metodos.map((m) => {
                  const parte = cobrado > 0 ? Number(m.monto) / cobrado : 0;
                  return (
                    <TableRow key={m.metodo}>
                      <TableCell className="pl-6 font-medium">{m.metodo}</TableCell>
                      <TableCell className="text-right tabular-nums">{m.pagos}</TableCell>
                      <TableCell className="text-right tabular-nums">{formatPEN(m.monto)}</TableCell>
                      <TableCell className="pr-6">
                        <div className="flex items-center gap-2">
                          <div className="h-1.5 flex-1 rounded-full bg-muted">
                            <div className="h-full rounded-full bg-(--chart-3)" style={{ width: `${(parte * 100).toFixed(1)}%` }} />
                          </div>
                          <span className="w-12 text-right text-xs text-muted-foreground tabular-nums">{pct(Number(m.monto), cobrado)}</span>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
              {metodos.length > 1 && (
                <TableFooter>
                  <TableRow>
                    <TableCell className="pl-6 font-medium">Total</TableCell>
                    <TableCell className="text-right tabular-nums">{metodos.reduce((s, m) => s + m.pagos, 0)}</TableCell>
                    <TableCell className="text-right font-semibold tabular-nums">{formatPEN(resumen.cobrado)}</TableCell>
                    <TableCell className="pr-6" />
                  </TableRow>
                </TableFooter>
              )}
            </Table>
          </CardContent>
        </Card>

        {porVendedor.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Por vendedor</CardTitle>
            </CardHeader>
            <CardContent className="px-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="pl-6">Vendedor</TableHead>
                    <TableHead className="text-right">Boletas</TableHead>
                    <TableHead className="text-right">Vendido</TableHead>
                    {a.utilidad && <TableHead className="text-right">Utilidad</TableHead>}
                    <TableHead className="pr-6 text-right">Por cobrar</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {porVendedor.map((v) => (
                    <TableRow key={v.vendedorId}>
                      <TableCell className="pl-6 font-medium">{v.vendedor}</TableCell>
                      <TableCell className="text-right tabular-nums">{v.ventas}</TableCell>
                      <TableCell className="text-right tabular-nums">{formatPEN(v.total)}</TableCell>
                      {a.utilidad && <TableCell className="text-right tabular-nums">{formatPEN(Number(v.total) - Number(v.costo))}</TableCell>}
                      <TableCell className="pr-6 text-right tabular-nums">{Number(v.saldo) > 0 ? formatPEN(v.saldo) : "—"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}
      </div>

      {conVentas && (
        <Card>
          <CardHeader>
            <CardTitle>Detalle por {tiempo.agrupacion === "dia" ? "día" : "mes"}</CardTitle>
          </CardHeader>
          <CardContent className="max-h-96 overflow-y-auto px-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-6">{tiempo.agrupacion === "dia" ? "Día" : "Mes"}</TableHead>
                  <TableHead className="text-right">Boletas</TableHead>
                  <TableHead className="text-right">Vendido</TableHead>
                  {a.utilidad && <TableHead className="pr-6 text-right">Utilidad</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {tiempo.puntos
                  .filter((pt) => pt.ventas > 0)
                  .reverse()
                  .map((pt) => (
                    <TableRow key={pt.clave}>
                      <TableCell className="pl-6 tabular-nums">{pt.clave.split("-").reverse().join("/")}</TableCell>
                      <TableCell className="text-right tabular-nums">{pt.ventas}</TableCell>
                      <TableCell className="text-right tabular-nums">{formatPEN(pt.total)}</TableCell>
                      {a.utilidad && (
                        <TableCell className="pr-6 text-right tabular-nums">{formatPEN(Number(pt.total) - Number(pt.costo))}</TableCell>
                      )}
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </>
  );
}
