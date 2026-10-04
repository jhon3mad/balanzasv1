import type { Metadata } from "next";
import Link from "next/link";
import { PlusIcon, XIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PageHeader } from "@/components/layout/page-header";
import { DateRangeFilter } from "@/components/data/date-range-filter";
import { FilterSelect } from "@/components/data/filter-select";
import { PaginationBar } from "@/components/data/pagination-bar";
import { SearchInput } from "@/components/data/search-input";
import { formatFechaHora } from "@/lib/dates";
import { formatPEN } from "@/lib/money";
import { rolTienePermiso } from "@/lib/permissions";
import { paramEnum, paramId, paramPagina, paramTexto } from "@/lib/search-params";
import { requirePermission } from "@/lib/session";
import { ENTREGAS_FILTRO_VENTA, ESTADOS_FILTRO_VENTA, PAGOS_FILTRO_VENTA } from "@/features/ventas/schemas";
import { listarVentas, nombreCliente, opcionesVendedores, resumenVentasHoy } from "@/features/ventas/queries";
import { EstadoEntregaBadge, EstadoPagoBadge, EstadoVentaBadge } from "@/features/ventas/components/venta-badges";

export const metadata: Metadata = { title: "Ventas" };

const OPCIONES_ESTADO = [
  { value: "EMITIDA", label: "Vigentes" },
  { value: "ANULADA", label: "Anuladas" },
];
const OPCIONES_PAGO = [
  { value: "DEUDA", label: "Con saldo por cobrar" },
  { value: "PENDIENTE", label: "Sin pagar" },
  { value: "PARCIAL", label: "Pago parcial" },
  { value: "PAGADO", label: "Pagadas" },
];
const OPCIONES_ENTREGA = [
  { value: "PENDIENTE", label: "Por entregar" },
  { value: "ENTREGADO", label: "Entregadas" },
];

function Resumen({ label, valor, detalle }: { label: string; valor: string; detalle?: React.ReactNode }) {
  return (
    <Card size="sm">
      <CardContent>
        <div className="text-xs text-muted-foreground">{label}</div>
        <div className="text-xl font-semibold tabular-nums">{valor}</div>
        {detalle && <div className="text-xs text-muted-foreground">{detalle}</div>}
      </CardContent>
    </Card>
  );
}

export default async function VentasPage({ searchParams }: PageProps<"/ventas">) {
  const session = await requirePermission({ venta: ["ver"] });
  const rol = session.user.role;
  const verTotales = rolTienePermiso(rol, { reporte: ["ventas"] });
  const verPropias = rolTienePermiso(rol, { reporte: ["ventasPropias"] });
  const sp = await searchParams;

  const vendedores = await opcionesVendedores();
  const vendedorParam = paramTexto(sp.vendedor);
  const vendedorId = vendedores.some((v) => v.value === vendedorParam) ? vendedorParam : undefined;
  const clienteId = paramId(sp.cliente);

  const [resultado, cliente, hoy] = await Promise.all([
    listarVentas({
      q: paramTexto(sp.q),
      desde: paramTexto(sp.desde),
      hasta: paramTexto(sp.hasta),
      vendedorId,
      clienteId,
      estado: paramEnum(sp.estado, ESTADOS_FILTRO_VENTA),
      pago: paramEnum(sp.pago, PAGOS_FILTRO_VENTA),
      entrega: paramEnum(sp.entrega, ENTREGAS_FILTRO_VENTA),
      page: paramPagina(sp.page),
    }),
    clienteId ? nombreCliente(clienteId) : null,
    !verTotales && verPropias ? resumenVentasHoy(session.user.id) : null,
  ]);

  // Enlace para quitar el filtro de cliente conservando los demás
  const sinCliente = new URLSearchParams(
    Object.entries(sp).flatMap(([k, v]) => (typeof v === "string" && k !== "cliente" && k !== "page" ? [[k, v]] : [])),
  ).toString();

  return (
    <>
      <PageHeader titulo="Ventas" descripcion="Boletas emitidas, cobros pendientes y entregas.">
        {rolTienePermiso(rol, { venta: ["crear"] }) && (
          <Button nativeButton={false} render={<Link href="/ventas/nueva" />}>
            <PlusIcon />
            Nueva venta
          </Button>
        )}
      </PageHeader>

      {verTotales && (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Resumen label="Ventas (sin anuladas)" valor={String(resultado.resumen.ventas)} detalle="según los filtros" />
          <Resumen label="Total vendido" valor={formatPEN(resultado.resumen.total)} />
          <Resumen label="Cobrado" valor={formatPEN(resultado.resumen.cobrado)} />
          <Resumen label="Por cobrar" valor={formatPEN(resultado.resumen.saldo)} />
        </div>
      )}
      {hoy && (
        <div className="grid grid-cols-2 gap-3 sm:max-w-md">
          <Resumen
            label="Mis ventas de hoy"
            valor={String(hoy.ventas)}
            detalle={
              <Link className="underline-offset-2 hover:underline" href={`/ventas?vendedor=${session.user.id}&desde=${hoy.hoy}&hasta=${hoy.hoy}`}>
                Ver detalle
              </Link>
            }
          />
          <Resumen label="Total vendido hoy" valor={formatPEN(hoy.total)} />
        </div>
      )}

      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
        <SearchInput placeholder="N° de boleta, cliente o documento…" />
        <DateRangeFilter />
        <FilterSelect param="estado" opciones={OPCIONES_ESTADO} todos="Vigentes y anuladas" />
        <FilterSelect param="pago" opciones={OPCIONES_PAGO} todos="Todos los pagos" />
        <FilterSelect param="entrega" opciones={OPCIONES_ENTREGA} todos="Todas las entregas" />
        <FilterSelect param="vendedor" opciones={vendedores} todos="Todos los vendedores" />
      </div>
      {clienteId && (
        <div>
          <Badge variant="secondary" className="h-7 gap-1 pr-1 text-sm">
            Cliente: {cliente ?? `#${clienteId}`}
            <Link href={`/ventas${sinCliente ? `?${sinCliente}` : ""}`} aria-label="Quitar filtro de cliente" className="rounded-sm p-0.5 hover:bg-background">
              <XIcon className="size-3.5" />
            </Link>
          </Badge>
        </div>
      )}

      <div className="rounded-xl border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>N°</TableHead>
              <TableHead>Fecha</TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead>Vendedor</TableHead>
              <TableHead className="text-right">Total</TableHead>
              <TableHead className="text-right">Saldo</TableHead>
              <TableHead>Estado</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {resultado.items.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                  No se encontraron ventas.
                </TableCell>
              </TableRow>
            )}
            {resultado.items.map((v) => {
              const anulada = v.estado === "ANULADA";
              return (
                <TableRow key={v.id} className={anulada ? "text-muted-foreground" : undefined}>
                  <TableCell>
                    <Link href={`/ventas/${v.id}`} className="font-mono font-medium hover:underline">
                      {v.numero}
                    </Link>
                  </TableCell>
                  <TableCell>{formatFechaHora(v.fechaEmision)}</TableCell>
                  <TableCell className="max-w-xs truncate">{v.cliente ?? <span className="text-muted-foreground">Cliente general</span>}</TableCell>
                  <TableCell>{v.vendedor}</TableCell>
                  <TableCell className={anulada ? "text-right tabular-nums line-through" : "text-right tabular-nums"}>
                    {formatPEN(v.total)}
                  </TableCell>
                  <TableCell className={!anulada && Number(v.saldo) > 0 ? "text-right font-medium text-destructive tabular-nums" : "text-right tabular-nums"}>
                    {anulada || Number(v.saldo) === 0 ? "—" : formatPEN(v.saldo)}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {anulada ? (
                        <EstadoVentaBadge estado={v.estado} />
                      ) : (
                        <>
                          <EstadoPagoBadge estado={v.estadoPago} />
                          {v.estadoEntrega === "PENDIENTE" && <EstadoEntregaBadge estado={v.estadoEntrega} />}
                        </>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
      <PaginationBar page={resultado.page} pageSize={resultado.pageSize} total={resultado.total} />
    </>
  );
}
