import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeftIcon } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/layout/page-header";
import { formatFecha, formatFechaHora } from "@/lib/dates";
import { formatPEN } from "@/lib/money";
import { rolTienePermiso } from "@/lib/permissions";
import { paramId } from "@/lib/search-params";
import { requirePermission } from "@/lib/session";
import { metodosPagoVenta, opcionesProductosVenta } from "@/features/ventas/queries";
import { PagosVentaTable } from "@/features/ventas/components/pagos-venta-table";
import { ESTADO_ORDEN_LABELS, esFinal } from "@/features/ordenes/constants";
import { obtenerOrden, opcionesServicios } from "@/features/ordenes/queries";
import { ItemsOrden } from "@/features/ordenes/components/items-orden";
import { OrdenAcciones } from "@/features/ordenes/components/orden-acciones";
import { EstadoOrdenBadge, VencidaBadge } from "@/features/ordenes/components/estado-orden-badge";

export const metadata: Metadata = { title: "Orden de servicio" };

function Dato({ label, valor, className }: { label: string; valor: React.ReactNode; className?: string }) {
  return (
    <div className={className ?? "space-y-0.5"}>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="text-sm font-medium whitespace-pre-line">{valor ?? "—"}</dd>
    </div>
  );
}

export default async function OrdenPage({ params }: PageProps<"/servicios/[id]">) {
  const session = await requirePermission({ ordenServicio: ["ver"] });
  const rol = session.user.role;
  const permisos = {
    actualizar: rolTienePermiso(rol, { ordenServicio: ["actualizar"] }),
    anular: rolTienePermiso(rol, { ordenServicio: ["anular"] }),
    cobrar: rolTienePermiso(rol, { venta: ["cobrar"] }),
    entregar: rolTienePermiso(rol, { ordenServicio: ["actualizar"], venta: ["entregar"] }),
  };
  const id = paramId((await params).id);
  const orden = id ? await obtenerOrden(id) : null;
  if (!orden) notFound();

  const final = esFinal(orden.estado);
  const editable = !final && permisos.actualizar;
  const [metodos, servicios, productos] = await Promise.all([
    permisos.cobrar ? metodosPagoVenta() : [],
    editable ? opcionesServicios() : [],
    editable ? opcionesProductosVenta() : [],
  ]);
  const cancelada = orden.estado === "CANCELADO";
  const cancelacion = cancelada ? orden.historial.findLast((h) => h.estadoNuevo === "CANCELADO") : undefined;

  return (
    <>
      <div>
        <Button variant="ghost" size="sm" className="-ml-2" nativeButton={false} render={<Link href="/servicios" />}>
          <ArrowLeftIcon />
          Órdenes de servicio
        </Button>
      </div>
      <PageHeader titulo={`Orden ${orden.numero}`} descripcion={`${orden.equipo} · ${orden.cliente}`}>
        <OrdenAcciones orden={orden} metodos={metodos} permisos={permisos} />
      </PageHeader>

      <div className="flex flex-wrap items-center gap-2">
        <EstadoOrdenBadge estado={orden.estado} />
        {orden.vencida && <VencidaBadge />}
      </div>

      {cancelacion && (
        <Alert variant="destructive">
          <AlertTitle>Orden cancelada</AlertTitle>
          <AlertDescription>
            {cancelacion.usuario} · {formatFechaHora(cancelacion.fecha)} — {cancelacion.nota}
          </AlertDescription>
        </Alert>
      )}

      <div className="grid gap-6 lg:grid-cols-[1fr_22rem]">
        <div className="grid content-start gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Equipo</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="grid gap-4 sm:grid-cols-3">
                <Dato label="Equipo" valor={orden.equipo} />
                <Dato label="Marca" valor={orden.marca} />
                <Dato label="Modelo" valor={orden.modelo} />
                <Dato label="N° de serie" valor={orden.numeroSerie} />
                <Dato label="Accesorios" valor={orden.accesorios} className="space-y-0.5 sm:col-span-2" />
                <Dato label="Falla reportada" valor={orden.fallaReportada} className="space-y-0.5 sm:col-span-3" />
                <Dato label="Diagnóstico" valor={orden.diagnostico} className="space-y-0.5 sm:col-span-3" />
                {orden.observaciones && <Dato label="Observaciones" valor={orden.observaciones} className="space-y-0.5 sm:col-span-3" />}
              </dl>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Servicios y repuestos</CardTitle>
            </CardHeader>
            <CardContent className="px-0">
              <ItemsOrden
                ordenId={orden.id}
                numero={orden.numero}
                lineas={orden.lineas}
                total={orden.total}
                totalLista={orden.totalLista}
                editable={editable}
                servicios={servicios}
                productos={productos}
                puedeBajoMinimo={rolTienePermiso(rol, { venta: ["precioBajoMinimo"] })}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{orden.boleta ? "Pagos" : "Adelantos"}</CardTitle>
            </CardHeader>
            <CardContent className="px-0">
              <PagosVentaTable
                pagos={orden.pagos}
                puedeAnular={!cancelada && permisos.cobrar && rolTienePermiso(rol, { venta: ["anular"] })}
                vacio={orden.boleta ? "Sin pagos." : "Sin adelantos."}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Cliente</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="grid gap-4 sm:grid-cols-3">
                <Dato label="Nombre" valor={orden.cliente} />
                <Dato label="Documento" valor={orden.clienteDocumento} />
                <Dato label="Celular" valor={orden.clienteTelefono} />
              </dl>
            </CardContent>
          </Card>
        </div>

        <div className="grid content-start gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Taller</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="grid gap-4">
                <Dato label="Recepción" valor={`${formatFechaHora(orden.fechaRecepcion)} · ${orden.recibidoPor}`} />
                <Dato label="Técnico" valor={orden.tecnico ?? "Sin asignar"} />
                <Dato
                  label="Fecha prometida"
                  valor={
                    orden.fechaPrometida ? (
                      <span className={orden.vencida ? "text-destructive" : undefined}>{formatFecha(orden.fechaPrometida)}</span>
                    ) : null
                  }
                />
                <Dato label="Presupuesto" valor={orden.presupuesto ? formatPEN(orden.presupuesto) : "Por definir"} />
                <Dato label="Garantía" valor={orden.garantiaDias != null ? `${orden.garantiaDias} días` : null} />
                {orden.fechaListo && <Dato label="Listo desde" valor={formatFechaHora(orden.fechaListo)} />}
                {orden.fechaEntrega && <Dato label="Entregado" valor={formatFechaHora(orden.fechaEntrega)} />}
              </dl>
              {!cancelada && (
                <div className="mt-4 grid gap-1 border-t pt-4 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Total</span>
                    <span className="font-semibold tabular-nums">{formatPEN(orden.total)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{orden.boleta ? "Pagado" : "Adelantos"}</span>
                    <span className="tabular-nums">{formatPEN(orden.montoPagado)}</span>
                  </div>
                  <div className="flex justify-between text-base">
                    <span>Saldo</span>
                    <span className={Number(orden.saldo) > 0 ? "font-semibold text-destructive tabular-nums" : "font-semibold tabular-nums"}>
                      {formatPEN(orden.saldo)}
                    </span>
                  </div>
                  {orden.boleta && (
                    <Link href={`/ventas/${orden.ventaId}`} className="mt-1 text-xs underline-offset-2 hover:underline">
                      Boleta {orden.boleta}
                    </Link>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Historial</CardTitle>
            </CardHeader>
            <CardContent>
              <ol className="relative grid gap-4 border-l pl-4">
                {orden.historial
                  .slice()
                  .reverse()
                  .map((h) => (
                    <li key={h.id} className="relative">
                      <span className="absolute top-1.5 left-[-1.3rem] size-2 rounded-full bg-primary" />
                      <div className="text-sm font-medium">
                        {h.estadoAnterior === h.estadoNuevo
                          ? "Datos actualizados"
                          : h.estadoAnterior
                            ? `${ESTADO_ORDEN_LABELS[h.estadoAnterior]} → ${ESTADO_ORDEN_LABELS[h.estadoNuevo]}`
                            : ESTADO_ORDEN_LABELS[h.estadoNuevo]}
                      </div>
                      {h.nota && <div className="text-sm whitespace-pre-line text-muted-foreground">{h.nota}</div>}
                      <div className="text-xs text-muted-foreground">
                        {formatFechaHora(h.fecha)} · {h.usuario}
                      </div>
                    </li>
                  ))}
              </ol>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
