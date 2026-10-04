import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeftIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PageHeader } from "@/components/layout/page-header";
import { formatFechaHora } from "@/lib/dates";
import { formatPEN } from "@/lib/money";
import { rolTienePermiso } from "@/lib/permissions";
import { paramId } from "@/lib/search-params";
import { requirePermission } from "@/lib/session";
import { cn } from "@/lib/utils";
import { MOTIVO_AJUSTE_INFO } from "@/features/inventario/constants";
import { obtenerAjuste } from "@/features/inventario/queries";

export const metadata: Metadata = { title: "Ajuste de inventario" };

export default async function AjustePage({ params }: PageProps<"/inventario/ajustes/[id]">) {
  const session = await requirePermission({ inventario: ["ajustar"] });
  const verCosto = rolTienePermiso(session.user.role, { producto: ["verCosto"] });
  const id = paramId((await params).id);
  const ajuste = id ? await obtenerAjuste(id, verCosto) : null;
  if (!ajuste) notFound();

  return (
    <>
      <div>
        <Button variant="ghost" size="sm" className="-ml-2" nativeButton={false} render={<Link href="/inventario/ajustes" />}>
          <ArrowLeftIcon />
          Ajustes
        </Button>
      </div>
      <PageHeader
        titulo={`Ajuste #${ajuste.id} — ${MOTIVO_AJUSTE_INFO[ajuste.motivo].label}`}
        descripcion={`${formatFechaHora(ajuste.fecha)} · ${ajuste.usuario}`}
      />
      {ajuste.observacion && <p className="max-w-3xl text-sm">{ajuste.observacion}</p>}

      <Card>
        <CardHeader>
          <CardTitle>Productos ajustados</CardTitle>
        </CardHeader>
        <CardContent className="px-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-6">Producto</TableHead>
                <TableHead className="text-right">Antes</TableHead>
                <TableHead className="text-right">Cambio</TableHead>
                <TableHead className="text-right">Después</TableHead>
                {verCosto && <TableHead className="text-right">Costo unit.</TableHead>}
                <TableHead className="pr-6">Detalle</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {ajuste.movimientos.map((m) => (
                <TableRow key={m.id}>
                  <TableCell className="pl-6 whitespace-normal">
                    <Link href={`/productos/${m.productoId}`} className="font-medium hover:underline">
                      {m.producto}
                    </Link>
                    <div className="text-xs text-muted-foreground">
                      {m.presentacion} · <span className="font-mono">{m.codigo}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{m.stockAnterior}</TableCell>
                  <TableCell
                    className={cn(
                      "text-right font-medium tabular-nums",
                      m.cantidad > 0 ? "text-emerald-600 dark:text-emerald-400" : "text-destructive",
                    )}
                  >
                    {m.cantidad > 0 ? `+${m.cantidad}` : m.cantidad}
                  </TableCell>
                  <TableCell className="text-right font-medium tabular-nums">{m.stockNuevo}</TableCell>
                  {verCosto && <TableCell className="text-right tabular-nums">{formatPEN(m.costoUnitario)}</TableCell>}
                  <TableCell className="pr-6 text-sm text-muted-foreground">{m.nota}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </>
  );
}
