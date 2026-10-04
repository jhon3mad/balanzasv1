import type { Metadata } from "next";
import Link from "next/link";
import { HistoryIcon, PackageXIcon, TriangleAlertIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PageHeader } from "@/components/layout/page-header";
import { FilterSelect } from "@/components/data/filter-select";
import { PaginationBar } from "@/components/data/pagination-bar";
import { SearchInput } from "@/components/data/search-input";
import { formatPEN } from "@/lib/money";
import { rolTienePermiso } from "@/lib/permissions";
import { paramEnum, paramPagina, paramTexto } from "@/lib/search-params";
import { requirePermission } from "@/lib/session";
import { TIPO_PRODUCTO_LABELS, TIPOS_PRODUCTO } from "@/features/productos/constants";
import { ESTADOS_STOCK } from "@/features/inventario/constants";
import { listarStock, resumenStock } from "@/features/inventario/queries";

export const metadata: Metadata = { title: "Stock" };

const OPCIONES_TIPO = TIPOS_PRODUCTO.map((t) => ({ value: t, label: TIPO_PRODUCTO_LABELS[t] }));
const OPCIONES_ESTADO = [
  { value: "bajo", label: "Stock bajo" },
  { value: "agotado", label: "Agotados" },
  { value: "con-stock", label: "Con stock" },
];

export default async function StockPage({ searchParams }: PageProps<"/inventario/stock">) {
  const session = await requirePermission({ inventario: ["ver"] });
  const rol = session.user.role;
  const verCosto = rolTienePermiso(rol, { producto: ["verCosto"] });
  const verKardex = rolTienePermiso(rol, { inventario: ["verKardex"] });
  const sp = await searchParams;
  const [resultado, resumen] = await Promise.all([
    listarStock({
      q: paramTexto(sp.q),
      tipo: paramEnum(sp.tipo, TIPOS_PRODUCTO),
      estado: paramEnum(sp.estado, ESTADOS_STOCK),
      page: paramPagina(sp.page),
      verCosto,
    }),
    resumenStock(verCosto),
  ]);

  return (
    <>
      <PageHeader titulo="Stock" descripcion="Existencias actuales por presentación." />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card size="sm">
          <CardHeader>
            <CardDescription>Presentaciones activas</CardDescription>
            <CardTitle className="text-2xl tabular-nums">{resumen.items}</CardTitle>
          </CardHeader>
        </Card>
        <Link href="/inventario/stock?estado=bajo" className="rounded-xl outline-none focus-visible:ring-3 focus-visible:ring-ring/50">
          <Card size="sm" className="h-full transition-colors hover:bg-muted/40">
            <CardHeader>
              <CardDescription className="flex items-center gap-1.5">
                <TriangleAlertIcon className="size-3.5 text-amber-500" /> Stock bajo
              </CardDescription>
              <CardTitle className="text-2xl tabular-nums">{resumen.bajo}</CardTitle>
            </CardHeader>
          </Card>
        </Link>
        <Link href="/inventario/stock?estado=agotado" className="rounded-xl outline-none focus-visible:ring-3 focus-visible:ring-ring/50">
          <Card size="sm" className="h-full transition-colors hover:bg-muted/40">
            <CardHeader>
              <CardDescription className="flex items-center gap-1.5">
                <PackageXIcon className="size-3.5 text-destructive" /> Agotados
              </CardDescription>
              <CardTitle className="text-2xl tabular-nums">{resumen.agotado}</CardTitle>
            </CardHeader>
          </Card>
        </Link>
        {resumen.valor !== null && (
          <Card size="sm">
            <CardHeader>
              <CardDescription>Valor del inventario (a costo)</CardDescription>
              <CardTitle className="text-2xl tabular-nums">{formatPEN(resumen.valor)}</CardTitle>
              <CardDescription>{resumen.unidades} unidades</CardDescription>
            </CardHeader>
          </Card>
        )}
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
        <SearchInput placeholder="Producto, marca o código…" />
        <FilterSelect param="tipo" opciones={OPCIONES_TIPO} todos="Todos los tipos" />
        <FilterSelect param="estado" opciones={OPCIONES_ESTADO} todos="Todo el stock" />
      </div>

      <div className="rounded-xl border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Producto</TableHead>
              <TableHead>Código</TableHead>
              <TableHead className="text-right">Stock</TableHead>
              <TableHead className="text-right">Mínimo</TableHead>
              {verCosto && <TableHead className="text-right">Costo prom.</TableHead>}
              {verCosto && <TableHead className="text-right">Valorizado</TableHead>}
              {verKardex && <TableHead className="w-12" />}
            </TableRow>
          </TableHeader>
          <TableBody>
            {resultado.items.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                  No se encontraron productos.
                </TableCell>
              </TableRow>
            )}
            {resultado.items.map((s) => {
              const agotado = s.stock <= 0;
              const bajo = s.stock <= s.stockMinimo;
              return (
                <TableRow key={s.id}>
                  <TableCell className="whitespace-normal">
                    <Link href={`/productos/${s.productoId}`} className="font-medium hover:underline">
                      {s.producto}
                    </Link>
                    <div className="text-xs text-muted-foreground">
                      {s.presentacion} · {TIPO_PRODUCTO_LABELS[s.tipo]}
                      {s.marca && ` · ${s.marca}`}
                    </div>
                  </TableCell>
                  <TableCell className="font-mono text-sm">{s.codigo}</TableCell>
                  <TableCell className="text-right">
                    <span className="inline-flex items-center gap-2">
                      {agotado ? (
                        <Badge variant="destructive">Agotado</Badge>
                      ) : bajo ? (
                        <Badge variant="secondary" className="text-amber-700 dark:text-amber-400">
                          Bajo
                        </Badge>
                      ) : null}
                      <span className="font-medium tabular-nums">{s.stock}</span>
                    </span>
                  </TableCell>
                  <TableCell className="text-right text-muted-foreground tabular-nums">{s.stockMinimo}</TableCell>
                  {verCosto && <TableCell className="text-right tabular-nums">{formatPEN(s.costoPromedio)}</TableCell>}
                  {verCosto && <TableCell className="text-right tabular-nums">{formatPEN(s.valorizado)}</TableCell>}
                  {verKardex && (
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label="Ver kardex"
                        title="Ver kardex"
                        nativeButton={false}
                        render={<Link href={`/inventario/kardex?presentacion=${s.id}`} />}
                      >
                        <HistoryIcon />
                      </Button>
                    </TableCell>
                  )}
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
