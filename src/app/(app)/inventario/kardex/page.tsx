import type { Metadata } from "next";
import Link from "next/link";
import { XIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import { cn } from "@/lib/utils";
import { TIPO_MOVIMIENTO_LABELS, TIPOS_MOVIMIENTO } from "@/features/inventario/constants";
import { listarKardex, nombrePresentacion } from "@/features/inventario/queries";

export const metadata: Metadata = { title: "Kardex" };

const OPCIONES_TIPO = TIPOS_MOVIMIENTO.map((t) => ({ value: t, label: TIPO_MOVIMIENTO_LABELS[t] }));

export default async function KardexPage({ searchParams }: PageProps<"/inventario/kardex">) {
  const session = await requirePermission({ inventario: ["verKardex"] });
  const verCosto = rolTienePermiso(session.user.role, { producto: ["verCosto"] });
  const sp = await searchParams;
  const presentacionId = paramId(sp.presentacion);
  const [resultado, filtroProducto] = await Promise.all([
    listarKardex({
      q: paramTexto(sp.q),
      presentacionId,
      tipo: paramEnum(sp.tipo, TIPOS_MOVIMIENTO),
      desde: paramTexto(sp.desde),
      hasta: paramTexto(sp.hasta),
      page: paramPagina(sp.page),
      verCosto,
    }),
    presentacionId ? nombrePresentacion(presentacionId) : null,
  ]);

  return (
    <>
      <PageHeader titulo="Kardex" descripcion="Historial de entradas y salidas de stock. Cada movimiento indica su origen." />

      {filtroProducto && (
        <div className="flex flex-wrap items-center gap-2 rounded-lg border bg-muted/30 px-3 py-2 text-sm">
          <span className="text-muted-foreground">Producto:</span>
          <Link href={`/productos/${filtroProducto.productoId}`} className="font-medium hover:underline">
            {filtroProducto.label}
          </Link>
          <Badge variant="secondary">Stock actual: {filtroProducto.stock}</Badge>
          <Button variant="ghost" size="sm" className="ml-auto" nativeButton={false} render={<Link href="/inventario/kardex" />}>
            <XIcon />
            Quitar filtro
          </Button>
        </div>
      )}

      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
        {!filtroProducto && <SearchInput placeholder="Producto o código…" />}
        <FilterSelect param="tipo" opciones={OPCIONES_TIPO} todos="Todos los movimientos" className="w-full sm:w-52" />
        <DateRangeFilter />
      </div>

      <div className="rounded-xl border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Fecha</TableHead>
              {!filtroProducto && <TableHead>Producto</TableHead>}
              <TableHead>Movimiento</TableHead>
              <TableHead className="text-right">Cantidad</TableHead>
              <TableHead className="text-right">Stock</TableHead>
              {verCosto && <TableHead className="text-right">Costo unit.</TableHead>}
              <TableHead>Origen</TableHead>
              <TableHead>Usuario</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {resultado.items.length === 0 && (
              <TableRow>
                <TableCell colSpan={8} className="h-24 text-center text-muted-foreground">
                  No hay movimientos con estos filtros.
                </TableCell>
              </TableRow>
            )}
            {resultado.items.map((m) => (
              <TableRow key={m.id}>
                <TableCell className="whitespace-nowrap">{formatFechaHora(m.fecha)}</TableCell>
                {!filtroProducto && (
                  <TableCell className="whitespace-normal">
                    <Link href={`/inventario/kardex?presentacion=${m.presentacionId}`} className="font-medium hover:underline">
                      {m.producto}
                    </Link>
                    <div className="text-xs text-muted-foreground">
                      {m.presentacion} · <span className="font-mono">{m.codigo}</span>
                    </div>
                  </TableCell>
                )}
                <TableCell>
                  <div>{TIPO_MOVIMIENTO_LABELS[m.tipo]}</div>
                  {m.nota && <div className="text-xs text-muted-foreground">{m.nota}</div>}
                </TableCell>
                <TableCell
                  className={cn(
                    "text-right font-medium tabular-nums",
                    m.cantidad > 0 ? "text-emerald-600 dark:text-emerald-400" : "text-destructive",
                  )}
                >
                  {m.cantidad > 0 ? `+${m.cantidad}` : m.cantidad}
                </TableCell>
                <TableCell className="text-right whitespace-nowrap tabular-nums">
                  <span className="text-muted-foreground">{m.stockAnterior} → </span>
                  <span className="font-medium">{m.stockNuevo}</span>
                </TableCell>
                {verCosto && <TableCell className="text-right tabular-nums">{formatPEN(m.costoUnitario)}</TableCell>}
                <TableCell>
                  {m.referencia ? (
                    m.referencia.href ? (
                      <Link href={m.referencia.href} className="font-mono text-sm hover:underline">
                        {m.referencia.texto}
                      </Link>
                    ) : (
                      <span className="font-mono text-sm">{m.referencia.texto}</span>
                    )
                  ) : (
                    "—"
                  )}
                </TableCell>
                <TableCell>{m.usuario}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <PaginationBar page={resultado.page} pageSize={resultado.pageSize} total={resultado.total} />
    </>
  );
}
