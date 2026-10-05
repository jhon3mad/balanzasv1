import type { Metadata } from "next";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PageHeader } from "@/components/layout/page-header";
import { PaginationBar } from "@/components/data/pagination-bar";
import { formatFechaHora } from "@/lib/dates";
import { formatPEN } from "@/lib/money";
import { paramPagina } from "@/lib/search-params";
import { requirePermission } from "@/lib/session";
import { cn } from "@/lib/utils";
import { listarCajas } from "@/features/caja/queries";

export const metadata: Metadata = { title: "Historial de caja" };

export default async function HistorialCajaPage({ searchParams }: PageProps<"/caja/historial">) {
  await requirePermission({ caja: ["historial"] });
  const r = await listarCajas(paramPagina((await searchParams).page));

  return (
    <>
      <PageHeader titulo="Historial de caja" descripcion="Turnos anteriores con su arqueo: lo que debía haber, lo contado y la diferencia." />
      <div className="rounded-xl border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Turno</TableHead>
              <TableHead>Abrió / cerró</TableHead>
              <TableHead className="text-right">Fondo</TableHead>
              <TableHead className="text-right">Debía haber</TableHead>
              <TableHead className="text-right">Contado</TableHead>
              <TableHead className="text-right">Diferencia</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {r.items.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                  Aún no hay cajas registradas.
                </TableCell>
              </TableRow>
            )}
            {r.items.map((c) => {
              const dif = Number(c.diferencia ?? 0);
              return (
                <TableRow key={c.id}>
                  <TableCell>
                    <Link href={`/caja/${c.id}`} className="font-medium hover:underline">
                      {formatFechaHora(c.fechaApertura)}
                    </Link>
                    <div className="text-xs text-muted-foreground">
                      {c.fechaCierre ? `hasta ${formatFechaHora(c.fechaCierre)}` : <Badge variant="secondary">Abierta</Badge>}
                    </div>
                  </TableCell>
                  <TableCell>
                    {c.abiertaPor}
                    {c.cerradaPor && c.cerradaPor !== c.abiertaPor && <div className="text-xs text-muted-foreground">cerró {c.cerradaPor}</div>}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{formatPEN(c.montoInicial)}</TableCell>
                  <TableCell className="text-right tabular-nums">{c.esperado ? formatPEN(c.esperado) : "—"}</TableCell>
                  <TableCell className="text-right tabular-nums">{c.contado ? formatPEN(c.contado) : "—"}</TableCell>
                  <TableCell className={cn("text-right font-medium tabular-nums", dif !== 0 && "text-destructive")}>
                    {c.diferencia === null ? "—" : dif === 0 ? "Cuadra" : `${dif > 0 ? "Sobra" : "Falta"} ${formatPEN(Math.abs(dif))}`}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
      <PaginationBar page={r.page} pageSize={r.pageSize} total={r.total} />
    </>
  );
}
