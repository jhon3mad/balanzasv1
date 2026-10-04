import type { Metadata } from "next";
import Link from "next/link";
import { FileSpreadsheetIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PageHeader } from "@/components/layout/page-header";
import { SearchInput } from "@/components/data/search-input";
import { formatFecha } from "@/lib/dates";
import { formatPEN } from "@/lib/money";
import { paramTexto } from "@/lib/search-params";
import { requirePermission } from "@/lib/session";
import { cn } from "@/lib/utils";
import { cuentasPorCobrar } from "@/features/ventas/queries";

export const metadata: Metadata = { title: "Cuentas por cobrar" };

function colorDias(dias: number) {
  if (dias > 90) return "text-destructive font-medium";
  if (dias > 30) return "text-amber-600 dark:text-amber-400";
  return undefined;
}

export default async function CuentasPorCobrarPage({ searchParams }: PageProps<"/cuentas-por-cobrar">) {
  await requirePermission({ venta: ["cobrar"] });
  const sp = await searchParams;
  const { clientes, total, tramos } = await cuentasPorCobrar({ q: paramTexto(sp.q) });

  return (
    <>
      <PageHeader titulo="Cuentas por cobrar" descripcion="Clientes con saldo pendiente, de la deuda más antigua a la más reciente.">
        <Button variant="outline" nativeButton={false} render={<a href="/api/reportes/cuentas-por-cobrar" download />}>
          <FileSpreadsheetIcon />
          Exportar a Excel
        </Button>
      </PageHeader>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <Card size="sm" className="col-span-2 lg:col-span-1">
          <CardContent>
            <div className="text-xs text-muted-foreground">Total por cobrar</div>
            <div className="text-xl font-semibold tabular-nums">{formatPEN(total)}</div>
            <div className="text-xs text-muted-foreground">
              {clientes.length} {clientes.length === 1 ? "cliente" : "clientes"}
            </div>
          </CardContent>
        </Card>
        {tramos.map((t) => (
          <Card key={t.clave} size="sm">
            <CardContent>
              <div className="text-xs text-muted-foreground">{t.label}</div>
              <div className={cn("text-lg font-semibold tabular-nums", Number(t.monto) === 0 && "text-muted-foreground")}>
                {formatPEN(t.monto)}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <SearchInput placeholder="Cliente, documento o celular…" />

      <div className="rounded-xl border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Cliente</TableHead>
              <TableHead>Celular</TableHead>
              <TableHead className="text-right">Ventas con saldo</TableHead>
              <TableHead>Más antigua</TableHead>
              <TableHead className="text-right">Antigüedad</TableHead>
              <TableHead className="text-right">Saldo</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {clientes.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                  {paramTexto(sp.q) ? "No se encontraron clientes con saldo." : "No hay saldos pendientes."}
                </TableCell>
              </TableRow>
            )}
            {clientes.map((c) => (
              <TableRow key={c.clienteId}>
                <TableCell className="max-w-sm whitespace-normal">
                  <Link href={`/ventas?cliente=${c.clienteId}&pago=DEUDA`} className="font-medium hover:underline">
                    {c.nombre}
                  </Link>
                  {c.documento && <div className="font-mono text-xs text-muted-foreground">{c.documento}</div>}
                </TableCell>
                <TableCell>{c.telefono ?? "—"}</TableCell>
                <TableCell className="text-right">
                  <Badge variant="secondary">{c.ventas}</Badge>
                </TableCell>
                <TableCell>{formatFecha(c.masAntigua)}</TableCell>
                <TableCell className={cn("text-right tabular-nums", colorDias(c.dias))}>
                  {c.dias === 1 ? "1 día" : `${c.dias} días`}
                </TableCell>
                <TableCell className="text-right font-medium tabular-nums">{formatPEN(c.saldo)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </>
  );
}
