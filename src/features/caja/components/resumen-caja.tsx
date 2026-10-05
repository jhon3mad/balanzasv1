import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatFechaHora } from "@/lib/dates";
import { formatPEN } from "@/lib/money";
import { cn } from "@/lib/utils";
import type { CajaDTO } from "../queries";

function Fila({ label, valor, signo, fuerte }: { label: string; valor: string; signo?: "+" | "−"; fuerte?: boolean }) {
  return (
    <div className={cn("flex items-baseline justify-between gap-4", fuerte && "border-t pt-2 text-base font-semibold")}>
      <span className={fuerte ? undefined : "text-muted-foreground"}>{label}</span>
      <span className="tabular-nums">
        {signo && Number(valor) !== 0 ? `${signo} ` : ""}
        {formatPEN(valor)}
      </span>
    </div>
  );
}

/** Cuadre del efectivo, cobros por método y movimientos de una caja (abierta o cerrada). */
export function ResumenCajaView({ caja }: { caja: CajaDTO }) {
  const r = caja.resumen;
  const cerrada = caja.estado === "CERRADA";
  const diferencia = Number(caja.diferencia ?? 0);

  return (
    <>
      <div className="grid gap-6 lg:grid-cols-[22rem_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Efectivo</CardTitle>
            <CardDescription>{cerrada ? "Al momento del cierre." : "Hasta este momento."}</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-2 text-sm">
            <Fila label="Fondo inicial" valor={r.montoInicial} />
            <Fila label="Cobros en efectivo" valor={r.efectivoCobrado} signo="+" />
            {Number(r.ingresos) > 0 && <Fila label="Ingresos" valor={r.ingresos} signo="+" />}
            {Number(r.egresos) > 0 && <Fila label="Retiros" valor={r.egresos} signo="−" />}
            {Number(r.efectivoReembolsado) > 0 && <Fila label="Devoluciones en efectivo" valor={r.efectivoReembolsado} signo="−" />}
            <Fila label="Debería haber" valor={r.esperado} fuerte />
            {cerrada && caja.efectivoContado && (
              <>
                <Fila label="Contado" valor={caja.efectivoContado} />
                <div
                  className={cn(
                    "flex items-baseline justify-between rounded-md px-2 py-1.5 font-medium",
                    diferencia === 0 ? "bg-emerald-500/10" : "bg-destructive/10 text-destructive",
                  )}
                >
                  <span>{diferencia === 0 ? "Cuadra exacto" : diferencia > 0 ? "Sobrante" : "Faltante"}</span>
                  <span className="tabular-nums">{formatPEN(Math.abs(diferencia))}</span>
                </div>
              </>
            )}
            {caja.observaciones && <p className="mt-1 text-xs whitespace-pre-line text-muted-foreground">{caja.observaciones}</p>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Cobrado por método</CardTitle>
            <CardDescription>Ventas, saldos y adelantos del turno; Yape, tarjeta, etc. no entran al efectivo.</CardDescription>
          </CardHeader>
          <CardContent className="px-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-6">Método</TableHead>
                  <TableHead className="text-right">Pagos</TableHead>
                  <TableHead className="text-right">Cobrado</TableHead>
                  <TableHead className="text-right">Devuelto</TableHead>
                  <TableHead className="pr-6 text-right">Neto</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {r.porMetodo.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="h-16 text-center text-muted-foreground">
                      Aún no hay cobros en este turno.
                    </TableCell>
                  </TableRow>
                )}
                {r.porMetodo.map((m) => (
                  <TableRow key={m.metodo}>
                    <TableCell className="pl-6 font-medium">
                      {m.metodo}
                      {m.esEfectivo && (
                        <Badge variant="secondary" className="ml-2">
                          efectivo
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{m.pagos}</TableCell>
                    <TableCell className="text-right tabular-nums">{formatPEN(m.cobrado)}</TableCell>
                    <TableCell className="text-right tabular-nums">{Number(m.reembolsado) > 0 ? formatPEN(m.reembolsado) : "—"}</TableCell>
                    <TableCell className="pr-6 text-right font-medium tabular-nums">{formatPEN(m.neto)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
              {r.porMetodo.length > 1 && (
                <TableFooter>
                  <TableRow>
                    <TableCell className="pl-6 font-medium" colSpan={4}>
                      Total del turno
                    </TableCell>
                    <TableCell className="pr-6 text-right font-semibold tabular-nums">{formatPEN(r.totalNeto)}</TableCell>
                  </TableRow>
                </TableFooter>
              )}
            </Table>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Ingresos y retiros</CardTitle>
        </CardHeader>
        <CardContent className="px-0">
          {caja.movimientos.length === 0 ? (
            <p className="px-6 text-sm text-muted-foreground">Sin ingresos ni retiros.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-6">Hora</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Concepto</TableHead>
                  <TableHead>Registró</TableHead>
                  <TableHead className="pr-6 text-right">Monto</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {caja.movimientos.map((m) => (
                  <TableRow key={m.id}>
                    <TableCell className="pl-6">{formatFechaHora(m.fecha)}</TableCell>
                    <TableCell>
                      <Badge variant={m.tipo === "INGRESO" ? "secondary" : "outline"}>{m.tipo === "INGRESO" ? "Ingreso" : "Retiro"}</Badge>
                    </TableCell>
                    <TableCell className="max-w-xs whitespace-normal">{m.concepto}</TableCell>
                    <TableCell>{m.usuario}</TableCell>
                    <TableCell className="pr-6 text-right tabular-nums">
                      {m.tipo === "INGRESO" ? "+" : "−"} {formatPEN(m.monto)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </>
  );
}
