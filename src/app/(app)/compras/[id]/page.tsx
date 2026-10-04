import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeftIcon } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PageHeader } from "@/components/layout/page-header";
import { formatFecha, formatFechaHora } from "@/lib/dates";
import { formatPEN } from "@/lib/money";
import { rolTienePermiso } from "@/lib/permissions";
import { paramId } from "@/lib/search-params";
import { requirePermission } from "@/lib/session";
import { describirEmpaque } from "@/features/compras/constants";
import { metodosPagoActivos, obtenerCompra } from "@/features/compras/queries";
import { CompraAcciones } from "@/features/compras/components/compra-acciones";
import { EstadoCompraBadge, EstadoPagoBadge } from "@/features/compras/components/compra-badges";
import { PagosCompraTable } from "@/features/compras/components/pagos-compra-table";

export const metadata: Metadata = { title: "Compra" };

function Dato({ label, valor }: { label: string; valor: React.ReactNode }) {
  return (
    <div className="space-y-0.5">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="text-sm font-medium">{valor ?? "—"}</dd>
    </div>
  );
}

export default async function CompraPage({ params }: PageProps<"/compras/[id]">) {
  const session = await requirePermission({ compra: ["ver"] });
  const rol = session.user.role;
  const id = paramId((await params).id);
  const [compra, metodos] = await Promise.all([id ? obtenerCompra(id) : null, metodosPagoActivos()]);
  if (!compra) notFound();

  const recibida = compra.estado === "RECIBIDA";
  const permisos = {
    editar: rolTienePermiso(rol, { compra: ["crear"] }),
    recibir: rolTienePermiso(rol, { compra: ["recibir"] }),
    pagar: rolTienePermiso(rol, { compra: ["pagar"] }),
    anular: rolTienePermiso(rol, { compra: ["anular"] }),
  };

  return (
    <>
      <div>
        <Button variant="ghost" size="sm" className="-ml-2" nativeButton={false} render={<Link href="/compras" />}>
          <ArrowLeftIcon />
          Compras
        </Button>
      </div>
      <PageHeader titulo={`Compra ${compra.numero}`} descripcion={compra.proveedor}>
        <CompraAcciones compra={compra} metodos={metodos} permisos={permisos} />
      </PageHeader>

      <div className="flex flex-wrap items-center gap-2">
        <EstadoCompraBadge estado={compra.estado} />
        {compra.estado !== "ANULADA" && <EstadoPagoBadge estado={compra.estadoPago} />}
      </div>

      {compra.estado === "ANULADA" && (
        <Alert variant="destructive">
          <AlertTitle>Compra anulada</AlertTitle>
          <AlertDescription>
            {compra.anuladoPor} · {formatFechaHora(compra.fechaAnulacion)} — {compra.motivoAnulacion}
          </AlertDescription>
        </Alert>
      )}

      <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
        <Card>
          <CardHeader>
            <CardTitle>Datos de la compra</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid gap-4 sm:grid-cols-3">
              <Dato label="Fecha del pedido" valor={formatFecha(compra.fechaPedido)} />
              <Dato label="Fecha de recepción" valor={compra.fechaRecepcion ? formatFecha(compra.fechaRecepcion) : "Pendiente"} />
              <Dato label="Factura / guía" valor={compra.documentoProveedor} />
              <Dato label="Registró" valor={compra.creadoPor} />
              <Dato label="Recibió" valor={compra.recibidoPor} />
              <Dato label="Registrado el" valor={formatFechaHora(compra.createdAt)} />
            </dl>
            {compra.observaciones && (
              <dl className="mt-4 border-t pt-4">
                <Dato label="Observaciones" valor={compra.observaciones} />
              </dl>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Resumen</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Total</span>
              <span className="font-semibold tabular-nums">{formatPEN(compra.total)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Pagado</span>
              <span className="tabular-nums">{formatPEN(compra.montoPagado)}</span>
            </div>
            <div className="flex justify-between border-t pt-2 text-base">
              <span>Saldo</span>
              <span className="font-semibold tabular-nums">
                {compra.estado === "ANULADA" ? "—" : formatPEN(compra.saldo)}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Productos</CardTitle>
          {!recibida && compra.estado === "PENDIENTE" && (
            <CardDescription>El stock subirá cuando se registre la recepción.</CardDescription>
          )}
        </CardHeader>
        <CardContent className="px-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-6">Producto</TableHead>
                <TableHead>Pedido</TableHead>
                <TableHead className="text-right">Unidades</TableHead>
                {recibida && <TableHead className="text-right">Recibidas</TableHead>}
                <TableHead className="text-right">Costo x empaque</TableHead>
                <TableHead className="text-right">Costo unit.</TableHead>
                <TableHead className="pr-6 text-right">Subtotal</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {compra.detalles.map((d) => {
                const diferencia = recibida && d.cantidadRecibida !== d.cantidadUnidades;
                return (
                  <TableRow key={d.id}>
                    <TableCell className="pl-6 whitespace-normal">
                      <div className="font-medium">{d.producto}</div>
                      <div className="text-xs text-muted-foreground">
                        {d.presentacion} · <span className="font-mono">{d.codigo}</span>
                      </div>
                    </TableCell>
                    <TableCell>{describirEmpaque(d.empaque, d.cantidadEmpaques, d.unidadesPorEmpaque)}</TableCell>
                    <TableCell className="text-right tabular-nums">{d.cantidadUnidades}</TableCell>
                    {recibida && (
                      <TableCell
                        className={
                          diferencia
                            ? "text-right font-medium text-amber-600 tabular-nums dark:text-amber-400"
                            : "text-right tabular-nums"
                        }
                      >
                        {d.cantidadRecibida}
                      </TableCell>
                    )}
                    <TableCell className="text-right tabular-nums">{formatPEN(d.costoEmpaque)}</TableCell>
                    <TableCell className="text-right tabular-nums">{formatPEN(d.costoUnitario)}</TableCell>
                    <TableCell className="pr-6 text-right tabular-nums">{formatPEN(d.subtotal)}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
            <TableFooter>
              <TableRow>
                <TableCell colSpan={recibida ? 6 : 5} className="pl-6 text-right font-medium">
                  Total
                </TableCell>
                <TableCell className="pr-6 text-right font-semibold tabular-nums">{formatPEN(compra.total)}</TableCell>
              </TableRow>
            </TableFooter>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Pagos al proveedor</CardTitle>
        </CardHeader>
        <CardContent className="px-0">
          <PagosCompraTable pagos={compra.pagos} puedeAnular={permisos.pagar && permisos.anular} />
        </CardContent>
      </Card>
    </>
  );
}
