import Link from "next/link";
import { ArrowRightIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardDescription, CardHeader, CardTitle, CardContent, CardAction } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/layout/page-header";
import { navegacionParaRol } from "@/config/navigation";
import { formatFechaHora, hoyLima } from "@/lib/dates";
import { cajaAbierta } from "@/features/caja/queries";
import { formatPEN } from "@/lib/money";
import { isRol, rolTienePermiso, ROL_LABELS } from "@/lib/permissions";
import { requireSession } from "@/lib/session";
import { deudaProveedores } from "@/features/compras/queries";
import { resumenStock } from "@/features/inventario/queries";
import { resumenOrdenes } from "@/features/ordenes/queries";
import { alcanceReportes } from "@/features/reportes/permisos";
import { indicadoresHoy, ventasUltimosDias } from "@/features/reportes/queries";
import { GraficoVentas } from "@/features/reportes/components/grafico-ventas";
import { Stat } from "@/features/reportes/components/stat";

export default async function InicioPage() {
  const session = await requireSession();
  const rol = session.user.role;
  const a = alcanceReportes(rol);
  const ver = {
    ventasHoy: a.ventas || a.soloPropias,
    ordenes: rolTienePermiso(rol, { ordenServicio: ["ver"] }),
    stock: rolTienePermiso(rol, { inventario: ["ver"] }),
    compras: rolTienePermiso(rol, { compra: ["ver"] }),
    caja: rolTienePermiso(rol, { caja: ["operar"] }),
  };
  const hoy = hoyLima();

  const [indicadores, ultimos, ordenes, stock, deuda, caja] = await Promise.all([
    ver.ventasHoy ? indicadoresHoy(a.soloPropias ? session.user.id : undefined) : null,
    a.ventas ? ventasUltimosDias(14) : null,
    ver.ordenes ? resumenOrdenes() : null,
    ver.stock ? resumenStock(false) : null,
    ver.compras ? deudaProveedores() : null,
    ver.caja ? cajaAbierta() : null,
  ]);

  const modulos = navegacionParaRol(rol)
    .flatMap((g) => g.items)
    .filter((i) => i.href !== "/" && i.disponible);

  return (
    <>
      <PageHeader titulo={`Hola, ${session.user.name}`} descripcion="Resumen del día y accesos rápidos.">
        <Badge variant="secondary">{isRol(rol) ? ROL_LABELS[rol] : "Sin rol"}</Badge>
      </PageHeader>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {ver.caja &&
          (caja ? (
            <Stat
              label="Efectivo en caja"
              valor={formatPEN(caja.resumen.esperado)}
              detalle={`Abierta desde ${formatFechaHora(caja.fechaApertura)}`}
              href="/caja/actual"
            />
          ) : (
            <Stat label="Caja" valor="Cerrada" detalle="Ábrela para empezar el día" href="/caja/actual" alerta />
          ))}
        {indicadores && (
          <>
            <Stat
              label={a.soloPropias ? "Mis ventas de hoy" : "Vendido hoy"}
              valor={formatPEN(indicadores.total)}
              detalle={`${indicadores.ventas} ${indicadores.ventas === 1 ? "boleta" : "boletas"}`}
              href={a.soloPropias ? `/ventas?vendedor=${session.user.id}&desde=${hoy}&hasta=${hoy}` : `/ventas?desde=${hoy}&hasta=${hoy}`}
            />
            <Stat
              label={a.soloPropias ? "Cobré hoy" : "Recibido hoy"}
              valor={formatPEN(indicadores.cobrado)}
              detalle="ventas, saldos y adelantos"
              href={`/reportes/ventas?desde=${hoy}&hasta=${hoy}`}
            />
          </>
        )}
        {indicadores?.porCobrar != null && rolTienePermiso(rol, { venta: ["cobrar"] }) && (
          <Stat label="Por cobrar" valor={formatPEN(indicadores.porCobrar)} detalle="saldo de clientes" href="/cuentas-por-cobrar" />
        )}
        {ordenes && (
          <Stat
            label="Órdenes de servicio"
            valor={`${ordenes.enCurso} en curso`}
            detalle={
              <>
                {ordenes.listas} listas para entregar
                {ordenes.vencidas > 0 && <span className="text-destructive"> · {ordenes.vencidas} vencidas</span>}
              </>
            }
            href={ordenes.vencidas > 0 ? "/servicios?estado=VENCIDAS" : "/servicios?estado=EN_CURSO"}
          />
        )}
        {stock && (
          <Stat
            label="Stock bajo"
            valor={String(stock.bajo)}
            detalle={stock.agotado > 0 ? `${stock.agotado} agotados` : "ninguno agotado"}
            href="/inventario/stock?estado=bajo"
            alerta={stock.agotado > 0}
          />
        )}
        {deuda !== null && Number(deuda) > 0 && (
          <Stat label="Deuda con proveedores" valor={formatPEN(deuda)} href="/compras?pago=DEUDA" />
        )}
      </div>

      {ultimos && (
        <Card>
          <CardHeader>
            <CardTitle>Vendido en los últimos 14 días</CardTitle>
            <CardDescription>Boletas emitidas, sin anuladas.</CardDescription>
            <CardAction>
              <Button variant="ghost" size="sm" nativeButton={false} render={<Link href="/reportes/ventas" />}>
                Ver reportes
                <ArrowRightIcon />
              </Button>
            </CardAction>
          </CardHeader>
          <CardContent>
            <GraficoVentas puntos={ultimos} className="h-48" />
          </CardContent>
        </Card>
      )}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {modulos.map((m) => (
          <Link key={m.href} href={m.href} className="rounded-xl outline-none focus-visible:ring-3 focus-visible:ring-ring/50">
            <Card size="sm" className="h-full transition-colors hover:border-primary/40 hover:bg-muted/40">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <m.icono className="size-4" />
                  </div>
                  <CardTitle className="flex-1">{m.titulo}</CardTitle>
                  <ArrowRightIcon className="size-4 text-muted-foreground" />
                </div>
              </CardHeader>
            </Card>
          </Link>
        ))}
      </div>
    </>
  );
}
