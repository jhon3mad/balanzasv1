import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatFecha } from "@/lib/dates";
import { formatPEN } from "@/lib/money";
import { paramTexto } from "@/lib/search-params";
import { requireSession } from "@/lib/session";
import { alcanceReportes } from "@/features/reportes/permisos";
import { periodoDe } from "@/features/reportes/periodo";
import { comprasPorProveedor, cuentasPorPagar } from "@/features/reportes/queries";
import { BarraPeriodo } from "@/features/reportes/components/barra-periodo";
import { Stat } from "@/features/reportes/components/stat";

export const metadata: Metadata = { title: "Reporte de compras" };

const sumar = (valores: string[]) => (valores.reduce((s, v) => s + Math.round(Number(v) * 100), 0) / 100).toFixed(2);

export default async function ReporteComprasPage({ searchParams }: PageProps<"/reportes/compras">) {
  const session = await requireSession();
  if (!alcanceReportes(session.user.role).compras) redirect("/sin-permiso");
  const sp = await searchParams;
  const p = periodoDe(paramTexto(sp.desde), paramTexto(sp.hasta));
  const [porProveedor, deudas] = await Promise.all([comprasPorProveedor(p), cuentasPorPagar()]);
  const totalCompras = sumar(porProveedor.map((f) => f.total));
  const totalDeuda = sumar(deudas.map((d) => d.saldo));

  return (
    <>
      <BarraPeriodo ruta="/reportes/compras" periodo={p} params={sp} excel="/api/reportes/compras" />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Compras recibidas" valor={formatPEN(totalCompras)} detalle={`${porProveedor.reduce((s, f) => s + f.compras, 0)} en el periodo`} />
        <Stat label="Cuentas por pagar" valor={formatPEN(totalDeuda)} detalle="a la fecha, todos los periodos" href="/compras?pago=DEUDA" />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Compras por proveedor</CardTitle>
            <CardDescription>Según la fecha de recepción.</CardDescription>
          </CardHeader>
          <CardContent className="px-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-6">Proveedor</TableHead>
                  <TableHead className="text-right">Compras</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead className="pr-6 text-right">Saldo</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {porProveedor.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="h-16 text-center text-muted-foreground">
                      Sin compras recibidas en el periodo.
                    </TableCell>
                  </TableRow>
                )}
                {porProveedor.map((f) => (
                  <TableRow key={f.proveedor}>
                    <TableCell className="max-w-56 truncate pl-6 font-medium">{f.proveedor}</TableCell>
                    <TableCell className="text-right tabular-nums">{f.compras}</TableCell>
                    <TableCell className="text-right tabular-nums">{formatPEN(f.total)}</TableCell>
                    <TableCell className="pr-6 text-right tabular-nums">{Number(f.saldo) > 0 ? formatPEN(f.saldo) : "—"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
              {porProveedor.length > 1 && (
                <TableFooter>
                  <TableRow>
                    <TableCell className="pl-6 font-medium" colSpan={2}>
                      Total
                    </TableCell>
                    <TableCell className="text-right font-semibold tabular-nums">{formatPEN(totalCompras)}</TableCell>
                    <TableCell className="pr-6" />
                  </TableRow>
                </TableFooter>
              )}
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Cuentas por pagar</CardTitle>
            <CardDescription>Saldo con cada proveedor a la fecha.</CardDescription>
          </CardHeader>
          <CardContent className="px-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-6">Proveedor</TableHead>
                  <TableHead className="text-right">Compras</TableHead>
                  <TableHead>Más antigua</TableHead>
                  <TableHead className="pr-6 text-right">Saldo</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {deudas.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="h-16 text-center text-muted-foreground">
                      No hay deudas con proveedores.
                    </TableCell>
                  </TableRow>
                )}
                {deudas.map((d) => (
                  <TableRow key={d.proveedor}>
                    <TableCell className="max-w-56 truncate pl-6 font-medium">{d.proveedor}</TableCell>
                    <TableCell className="text-right tabular-nums">{d.compras}</TableCell>
                    <TableCell>{formatFecha(d.masAntigua)}</TableCell>
                    <TableCell className="pr-6 text-right font-medium tabular-nums">{formatPEN(d.saldo)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {deudas.length > 0 && (
              <p className="px-6 pt-3 text-xs">
                <Link href="/compras?pago=DEUDA" className="underline-offset-2 hover:underline">
                  Ver compras con saldo y registrar pagos
                </Link>
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
