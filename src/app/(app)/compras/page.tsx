import type { Metadata } from "next";
import Link from "next/link";
import { PlusIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PageHeader } from "@/components/layout/page-header";
import { FilterSelect } from "@/components/data/filter-select";
import { PaginationBar } from "@/components/data/pagination-bar";
import { SearchInput } from "@/components/data/search-input";
import { formatFecha } from "@/lib/dates";
import { formatPEN } from "@/lib/money";
import { rolTienePermiso } from "@/lib/permissions";
import { paramEnum, paramId, paramPagina, paramTexto } from "@/lib/search-params";
import { requirePermission } from "@/lib/session";
import { ESTADO_COMPRA_LABELS, ESTADOS_COMPRA } from "@/features/compras/constants";
import { ESTADOS_FILTRO_COMPRA, PAGOS_FILTRO_COMPRA } from "@/features/compras/schemas";
import { deudaProveedores, listarCompras, opcionesProveedoresFiltro } from "@/features/compras/queries";
import { EstadoCompraBadge, EstadoPagoBadge } from "@/features/compras/components/compra-badges";

export const metadata: Metadata = { title: "Compras" };

const OPCIONES_ESTADO = ESTADOS_COMPRA.map((e) => ({ value: e, label: ESTADO_COMPRA_LABELS[e] }));
const OPCIONES_PAGO = [
  { value: "DEUDA", label: "Con saldo por pagar" },
  { value: "PENDIENTE", label: "Sin pagar" },
  { value: "PARCIAL", label: "Pago parcial" },
  { value: "PAGADO", label: "Pagadas" },
];

export default async function ComprasPage({ searchParams }: PageProps<"/compras">) {
  const session = await requirePermission({ compra: ["ver"] });
  const sp = await searchParams;
  const [resultado, proveedores, deuda] = await Promise.all([
    listarCompras({
      q: paramTexto(sp.q),
      estado: paramEnum(sp.estado, ESTADOS_FILTRO_COMPRA),
      pago: paramEnum(sp.pago, PAGOS_FILTRO_COMPRA),
      proveedorId: paramId(sp.proveedor),
      page: paramPagina(sp.page),
    }),
    opcionesProveedoresFiltro(),
    deudaProveedores(),
  ]);
  const puedeCrear = rolTienePermiso(session.user.role, { compra: ["crear"] });

  return (
    <>
      <PageHeader titulo="Compras" descripcion="Pedidos a proveedores, recepción de mercadería y pagos.">
        <div className="mr-2 text-right text-sm">
          <div className="text-muted-foreground">Deuda con proveedores</div>
          <div className="font-semibold tabular-nums">{formatPEN(deuda)}</div>
        </div>
        {puedeCrear && (
          <Button nativeButton={false} render={<Link href="/compras/nueva" />}>
            <PlusIcon />
            Nueva compra
          </Button>
        )}
      </PageHeader>

      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
        <SearchInput placeholder="N° de compra, proveedor o factura…" />
        <FilterSelect param="estado" opciones={OPCIONES_ESTADO} todos="Todos los estados" />
        <FilterSelect param="pago" opciones={OPCIONES_PAGO} todos="Todos los pagos" />
        <FilterSelect param="proveedor" opciones={proveedores} todos="Todos los proveedores" className="w-full sm:w-56" />
      </div>

      <div className="rounded-xl border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>N°</TableHead>
              <TableHead>Fecha</TableHead>
              <TableHead>Proveedor</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="text-right">Total</TableHead>
              <TableHead className="text-right">Saldo</TableHead>
              <TableHead>Pago</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {resultado.items.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                  No se encontraron compras.
                </TableCell>
              </TableRow>
            )}
            {resultado.items.map((c) => (
              <TableRow key={c.id} className={c.estado === "ANULADA" ? "text-muted-foreground" : undefined}>
                <TableCell>
                  <Link href={`/compras/${c.id}`} className="font-mono font-medium hover:underline">
                    {c.numero}
                  </Link>
                  {c.documentoProveedor && <div className="text-xs text-muted-foreground">{c.documentoProveedor}</div>}
                </TableCell>
                <TableCell>{formatFecha(c.fechaPedido)}</TableCell>
                <TableCell className="max-w-xs truncate">{c.proveedor}</TableCell>
                <TableCell>
                  <EstadoCompraBadge estado={c.estado} />
                </TableCell>
                <TableCell className="text-right tabular-nums">{formatPEN(c.total)}</TableCell>
                <TableCell className="text-right tabular-nums">
                  {c.estado === "ANULADA" ? "—" : formatPEN(c.saldo)}
                </TableCell>
                <TableCell>{c.estado !== "ANULADA" && <EstadoPagoBadge estado={c.estadoPago} />}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <PaginationBar page={resultado.page} pageSize={resultado.pageSize} total={resultado.total} />
    </>
  );
}
