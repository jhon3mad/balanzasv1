import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { FileSpreadsheetIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatNumero, formatPEN } from "@/lib/money";
import { requireSession } from "@/lib/session";
import { TIPO_PRODUCTO_LABELS } from "@/features/productos/constants";
import { alcanceReportes } from "@/features/reportes/permisos";
import { stockBajo, valorizadoPorTipo } from "@/features/reportes/queries";
import { Stat } from "@/features/reportes/components/stat";

export const metadata: Metadata = { title: "Reporte de inventario" };

const sumar = (valores: string[]) => (valores.reduce((s, v) => s + Math.round(Number(v) * 100), 0) / 100).toFixed(2);

export default async function ReporteInventarioPage() {
  const session = await requireSession();
  if (!alcanceReportes(session.user.role).inventario) redirect("/sin-permiso");
  const [tipos, bajo] = await Promise.all([valorizadoPorTipo(), stockBajo(50)]);
  const valor = sumar(tipos.map((t) => t.valor));
  const valorVenta = sumar(tipos.map((t) => t.valorVenta));
  const unidades = tipos.reduce((s, t) => s + t.unidades, 0);

  return (
    <>
      <div className="flex justify-end">
        <Button variant="outline" nativeButton={false} render={<a href="/api/reportes/inventario" download />}>
          <FileSpreadsheetIcon />
          Exportar a Excel
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Valor al costo" valor={formatPEN(valor)} detalle={`${formatNumero(unidades)} unidades`} />
        <Stat label="Valor a precio de venta" valor={formatPEN(valorVenta)} detalle={`Margen potencial ${formatPEN(Number(valorVenta) - Number(valor))}`} />
        <Stat label="Stock bajo o agotado" valor={String(bajo.length === 50 ? "50+" : bajo.length)} href="/inventario/stock?estado=bajo" alerta={bajo.length > 0} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Valorizado por tipo</CardTitle>
            <CardDescription>Stock actual al costo promedio.</CardDescription>
          </CardHeader>
          <CardContent className="px-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-6">Tipo</TableHead>
                  <TableHead className="text-right">Unidades</TableHead>
                  <TableHead className="text-right">Al costo</TableHead>
                  <TableHead className="pr-6 text-right">A precio de venta</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tipos.map((t) => (
                  <TableRow key={t.tipo}>
                    <TableCell className="pl-6 font-medium">{TIPO_PRODUCTO_LABELS[t.tipo]}</TableCell>
                    <TableCell className="text-right tabular-nums">{formatNumero(t.unidades)}</TableCell>
                    <TableCell className="text-right tabular-nums">{formatPEN(t.valor)}</TableCell>
                    <TableCell className="pr-6 text-right tabular-nums">{formatPEN(t.valorVenta)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
              <TableFooter>
                <TableRow>
                  <TableCell className="pl-6 font-medium">Total</TableCell>
                  <TableCell className="text-right tabular-nums">{formatNumero(unidades)}</TableCell>
                  <TableCell className="text-right font-semibold tabular-nums">{formatPEN(valor)}</TableCell>
                  <TableCell className="pr-6 text-right tabular-nums">{formatPEN(valorVenta)}</TableCell>
                </TableRow>
              </TableFooter>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Stock bajo</CardTitle>
            <CardDescription>En o por debajo del mínimo; primero los agotados.</CardDescription>
          </CardHeader>
          <CardContent className="max-h-96 overflow-y-auto px-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-6">Producto</TableHead>
                  <TableHead className="text-right">Stock</TableHead>
                  <TableHead className="pr-6 text-right">Mínimo</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {bajo.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={3} className="h-16 text-center text-muted-foreground">
                      Todo el stock está sobre el mínimo.
                    </TableCell>
                  </TableRow>
                )}
                {bajo.map((b) => (
                  <TableRow key={b.codigo}>
                    <TableCell className="max-w-64 pl-6 whitespace-normal">
                      <div className="font-medium">{b.producto}</div>
                      <div className="font-mono text-xs text-muted-foreground">{b.codigo}</div>
                    </TableCell>
                    <TableCell className={b.stock <= 0 ? "text-right font-medium text-destructive tabular-nums" : "text-right tabular-nums"}>
                      {b.stock}
                    </TableCell>
                    <TableCell className="pr-6 text-right tabular-nums">{b.stockMinimo}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <p className="px-6 pt-3 text-xs">
              <Link href="/compras/nueva" className="underline-offset-2 hover:underline">
                Registrar una compra
              </Link>
            </p>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
