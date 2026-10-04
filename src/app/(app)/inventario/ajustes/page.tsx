import type { Metadata } from "next";
import Link from "next/link";
import { PlusIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PageHeader } from "@/components/layout/page-header";
import { FilterSelect } from "@/components/data/filter-select";
import { PaginationBar } from "@/components/data/pagination-bar";
import { formatFechaHora } from "@/lib/dates";
import { paramEnum, paramPagina } from "@/lib/search-params";
import { requirePermission } from "@/lib/session";
import { MOTIVO_AJUSTE_INFO, MOTIVOS_AJUSTE } from "@/features/inventario/constants";
import { listarAjustes } from "@/features/inventario/queries";

export const metadata: Metadata = { title: "Ajustes de inventario" };

const OPCIONES_MOTIVO = MOTIVOS_AJUSTE.map((m) => ({ value: m, label: MOTIVO_AJUSTE_INFO[m].label }));

export default async function AjustesPage({ searchParams }: PageProps<"/inventario/ajustes">) {
  await requirePermission({ inventario: ["ajustar"] });
  const sp = await searchParams;
  const resultado = await listarAjustes({ motivo: paramEnum(sp.motivo, MOTIVOS_AJUSTE), page: paramPagina(sp.page) });

  return (
    <>
      <PageHeader
        titulo="Ajustes de inventario"
        descripcion="Correcciones de stock por conteo, merma, rotura y otros motivos. No se editan: para corregir uno, registra otro."
      >
        <Button nativeButton={false} render={<Link href="/inventario/ajustes/nuevo" />}>
          <PlusIcon />
          Nuevo ajuste
        </Button>
      </PageHeader>

      <div className="flex">
        <FilterSelect param="motivo" opciones={OPCIONES_MOTIVO} todos="Todos los motivos" className="w-full sm:w-60" />
      </div>

      <div className="rounded-xl border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>N°</TableHead>
              <TableHead>Fecha</TableHead>
              <TableHead>Motivo</TableHead>
              <TableHead className="text-right">Productos</TableHead>
              <TableHead className="text-right">Entradas</TableHead>
              <TableHead className="text-right">Salidas</TableHead>
              <TableHead>Registró</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {resultado.items.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                  Aún no hay ajustes registrados.
                </TableCell>
              </TableRow>
            )}
            {resultado.items.map((a) => (
              <TableRow key={a.id}>
                <TableCell>
                  <Link href={`/inventario/ajustes/${a.id}`} className="font-mono font-medium hover:underline">
                    #{a.id}
                  </Link>
                </TableCell>
                <TableCell className="whitespace-nowrap">{formatFechaHora(a.fecha)}</TableCell>
                <TableCell className="max-w-xs whitespace-normal">
                  <div>{MOTIVO_AJUSTE_INFO[a.motivo].label}</div>
                  {a.observacion && <div className="truncate text-xs text-muted-foreground">{a.observacion}</div>}
                </TableCell>
                <TableCell className="text-right tabular-nums">{a.productos}</TableCell>
                <TableCell className="text-right text-emerald-600 tabular-nums dark:text-emerald-400">
                  {a.entradas > 0 ? `+${a.entradas}` : "—"}
                </TableCell>
                <TableCell className="text-right text-destructive tabular-nums">{a.salidas > 0 ? `−${a.salidas}` : "—"}</TableCell>
                <TableCell>{a.usuario}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <PaginationBar page={resultado.page} pageSize={resultado.pageSize} total={resultado.total} />
    </>
  );
}
