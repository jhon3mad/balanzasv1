import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeftIcon } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PageHeader } from "@/components/layout/page-header";
import { formatFechaHora } from "@/lib/dates";
import { aCentimos, deCentimos, formatPEN } from "@/lib/money";
import { rolTienePermiso } from "@/lib/permissions";
import { paramId } from "@/lib/search-params";
import { requirePermission } from "@/lib/session";
import { metodosPagoVenta, obtenerVenta, opcionesClientesVenta } from "@/features/ventas/queries";
import { PagosVentaTable } from "@/features/ventas/components/pagos-venta-table";
import { CompartirBotones } from "@/features/impresion/components/compartir-botones";
import { VentaAcciones } from "@/features/ventas/components/venta-acciones";
import { EstadoEntregaBadge, EstadoPagoBadge, EstadoVentaBadge } from "@/features/ventas/components/venta-badges";

export const metadata: Metadata = { title: "Venta" };

function Dato({ label, valor }: { label: string; valor: React.ReactNode }) {
  return (
    <div className="space-y-0.5">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="text-sm font-medium">{valor ?? "—"}</dd>
    </div>
  );
}

function Fila({ label, valor, className }: { label: string; valor: string; className?: string }) {
  return (
    <div className={className ?? "flex justify-between"}>
      <span className="text-muted-foreground">{label}</span>
      <span className="tabular-nums">{valor}</span>
    </div>
  );
}

export default async function VentaPage({ params }: PageProps<"/ventas/[id]">) {
  const session = await requirePermission({ venta: ["ver"] });
  const rol = session.user.role;
  const permisos = {
    cobrar: rolTienePermiso(rol, { venta: ["cobrar"] }),
    entregar: rolTienePermiso(rol, { venta: ["entregar"] }),
    anular: rolTienePermiso(rol, { venta: ["anular"] }),
    crearCliente: rolTienePermiso(rol, { cliente: ["gestionar"] }),
  };
  const verUtilidad = rolTienePermiso(rol, { reporte: ["utilidad"] });

  const id = paramId((await params).id);
  const [venta, metodos, clientes] = await Promise.all([
    id ? obtenerVenta(id, { verCosto: verUtilidad }) : null,
    permisos.cobrar ? metodosPagoVenta() : [],
    permisos.cobrar ? opcionesClientesVenta() : [],
  ]);
  if (!venta) notFound();

  const anulada = venta.estado === "ANULADA";
  const conDescuento = venta.totalLista !== venta.total;
  const costoTotal = verUtilidad
    ? venta.lineas.reduce((s, l) => s + Math.round(Number(l.costoUnitario ?? 0) * l.cantidad * 100), 0)
    : 0;
  const utilidad = aCentimos(venta.total) - costoTotal;

  return (
    <>
      <div>
        <Button variant="ghost" size="sm" className="-ml-2" nativeButton={false} render={<Link href="/ventas" />}>
          <ArrowLeftIcon />
          Ventas
        </Button>
      </div>
      <PageHeader titulo={`Venta ${venta.numero}`} descripcion={venta.cliente ?? "Cliente general"}>
        <CompartirBotones tipo="venta" id={venta.id} numero={venta.numero} whatsapp={venta.estado === "EMITIDA"} />
        <VentaAcciones venta={venta} metodos={metodos} clientes={clientes} permisos={permisos} />
      </PageHeader>

      <div className="flex flex-wrap items-center gap-2">
        <EstadoVentaBadge estado={venta.estado} />
        {!anulada && <EstadoPagoBadge estado={venta.estadoPago} />}
        {!anulada && <EstadoEntregaBadge estado={venta.estadoEntrega} />}
        {venta.orden && (
          <Link href={`/servicios/${venta.orden.id}`} className="text-sm underline-offset-2 hover:underline">
            Orden de servicio {venta.orden.numero}
          </Link>
        )}
      </div>

      {anulada && (
        <Alert variant="destructive">
          <AlertTitle>Venta anulada</AlertTitle>
          <AlertDescription>
            {venta.anuladoPor} · {formatFechaHora(venta.fechaAnulacion)} — {venta.motivoAnulacion}
          </AlertDescription>
        </Alert>
      )}

      <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
        <Card>
          <CardHeader>
            <CardTitle>Datos de la venta</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid gap-4 sm:grid-cols-3">
              <Dato label="Emisión" valor={formatFechaHora(venta.fechaEmision)} />
              <Dato label="Vendedor" valor={venta.vendedor} />
              <Dato label="Cliente" valor={venta.cliente ?? "Cliente general"} />
              <Dato label="Documento" valor={venta.clienteDocumento} />
              <Dato label="Celular" valor={venta.clienteTelefono} />
              <Dato
                label="Entrega"
                valor={
                  venta.estadoEntrega === "ENTREGADO"
                    ? `${formatFechaHora(venta.fechaEntrega)}${venta.entregadoPor ? ` · ${venta.entregadoPor}` : ""}`
                    : "Pendiente"
                }
              />
            </dl>
            {venta.observaciones && (
              <dl className="mt-4 border-t pt-4">
                <Dato label="Observaciones" valor={venta.observaciones} />
              </dl>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Resumen</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-2 text-sm">
            {conDescuento && (
              <>
                <Fila label="Precio de lista" valor={formatPEN(venta.totalLista)} />
                <Fila
                  label={Number(venta.descuento) >= 0 ? "Descuento" : "Recargo"}
                  valor={formatPEN(Math.abs(Number(venta.descuento)))}
                />
              </>
            )}
            <div className="flex justify-between">
              <span className="text-muted-foreground">Total</span>
              <span className="font-semibold tabular-nums">{formatPEN(venta.total)}</span>
            </div>
            <Fila label={anulada ? "Pagado (devuelto)" : "Pagado"} valor={formatPEN(venta.montoPagado)} />
            <div className="flex justify-between border-t pt-2 text-base">
              <span>Saldo</span>
              <span className={!anulada && Number(venta.saldo) > 0 ? "font-semibold text-destructive tabular-nums" : "font-semibold tabular-nums"}>
                {anulada ? "—" : formatPEN(venta.saldo)}
              </span>
            </div>
            {verUtilidad && (
              <div className="grid gap-1 border-t pt-2 text-xs">
                <Fila label="Costo" valor={formatPEN(deCentimos(costoTotal))} />
                <Fila label="Utilidad" valor={formatPEN(deCentimos(utilidad))} />
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Productos</CardTitle>
        </CardHeader>
        <CardContent className="px-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-6">Producto</TableHead>
                <TableHead className="text-right">Cantidad</TableHead>
                <TableHead className="text-right">Precio lista</TableHead>
                <TableHead className="text-right">Precio unit.</TableHead>
                {verUtilidad && <TableHead className="text-right">Costo unit.</TableHead>}
                <TableHead className="pr-6 text-right">Subtotal</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {venta.lineas.map((l) => (
                <TableRow key={l.id}>
                  <TableCell className="pl-6 whitespace-normal">
                    <div className="font-medium">{l.descripcion}</div>
                    {l.codigo && <div className="font-mono text-xs text-muted-foreground">{l.codigo}</div>}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{l.cantidad}</TableCell>
                  <TableCell className="text-right text-muted-foreground tabular-nums">{formatPEN(l.precioLista)}</TableCell>
                  <TableCell className="text-right tabular-nums">{formatPEN(l.precioUnitario)}</TableCell>
                  {verUtilidad && <TableCell className="text-right text-muted-foreground tabular-nums">{formatPEN(l.costoUnitario)}</TableCell>}
                  <TableCell className="pr-6 text-right tabular-nums">{formatPEN(l.subtotal)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
            <TableFooter>
              <TableRow>
                <TableCell colSpan={verUtilidad ? 5 : 4} className="pl-6 text-right font-medium">
                  Total
                </TableCell>
                <TableCell className="pr-6 text-right font-semibold tabular-nums">{formatPEN(venta.total)}</TableCell>
              </TableRow>
            </TableFooter>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Pagos</CardTitle>
        </CardHeader>
        <CardContent className="px-0">
          <PagosVentaTable pagos={venta.pagos} puedeAnular={!anulada && permisos.cobrar && permisos.anular} />
        </CardContent>
      </Card>
    </>
  );
}
