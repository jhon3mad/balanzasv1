import type { Metadata } from "next";
import Link from "next/link";
import { PlusIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PageHeader } from "@/components/layout/page-header";
import { DateRangeFilter } from "@/components/data/date-range-filter";
import { FilterSelect } from "@/components/data/filter-select";
import { PaginationBar } from "@/components/data/pagination-bar";
import { SearchInput } from "@/components/data/search-input";
import { formatFecha } from "@/lib/dates";
import { rolTienePermiso } from "@/lib/permissions";
import { paramEnum, paramPagina, paramTexto } from "@/lib/search-params";
import { requirePermission } from "@/lib/session";
import { cn } from "@/lib/utils";
import { ESTADO_ORDEN_LABELS, ESTADOS_ORDEN } from "@/features/ordenes/constants";
import { ESTADOS_FILTRO_ORDEN } from "@/features/ordenes/schemas";
import { listarOrdenes, opcionesTecnicos, resumenOrdenes } from "@/features/ordenes/queries";
import { EstadoOrdenBadge, VencidaBadge } from "@/features/ordenes/components/estado-orden-badge";

export const metadata: Metadata = { title: "Órdenes de servicio" };

const OPCIONES_ESTADO = [
  { value: "EN_CURSO", label: "En curso" },
  { value: "VENCIDAS", label: "Vencidas" },
  ...ESTADOS_ORDEN.map((e) => ({ value: e, label: ESTADO_ORDEN_LABELS[e] })),
];

function Contador({ label, valor, href, alerta }: { label: string; valor: number; href: string; alerta?: boolean }) {
  return (
    <Link href={href} className="rounded-xl transition-opacity hover:opacity-80">
      <Card size="sm">
        <CardContent>
          <div className="text-xs text-muted-foreground">{label}</div>
          <div className={cn("text-xl font-semibold tabular-nums", alerta && valor > 0 && "text-destructive")}>{valor}</div>
        </CardContent>
      </Card>
    </Link>
  );
}

export default async function ServiciosPage({ searchParams }: PageProps<"/servicios">) {
  const session = await requirePermission({ ordenServicio: ["ver"] });
  const sp = await searchParams;
  const tecnicos = await opcionesTecnicos();
  const tecnicoParam = paramTexto(sp.tecnico);

  const [resultado, resumen] = await Promise.all([
    listarOrdenes({
      q: paramTexto(sp.q),
      estado: paramEnum(sp.estado, ESTADOS_FILTRO_ORDEN),
      tecnicoId: tecnicos.some((t) => t.value === tecnicoParam) ? tecnicoParam : undefined,
      desde: paramTexto(sp.desde),
      hasta: paramTexto(sp.hasta),
      page: paramPagina(sp.page),
    }),
    resumenOrdenes(),
  ]);

  return (
    <>
      <PageHeader titulo="Órdenes de servicio" descripcion="Equipos recibidos para reparación, mantenimiento o calibración.">
        {rolTienePermiso(session.user.role, { ordenServicio: ["crear"] }) && (
          <Button nativeButton={false} render={<Link href="/servicios/nueva" />}>
            <PlusIcon />
            Recibir equipo
          </Button>
        )}
      </PageHeader>

      <div className="grid grid-cols-3 gap-3 sm:max-w-xl">
        <Contador label="En curso" valor={resumen.enCurso} href="/servicios?estado=EN_CURSO" />
        <Contador label="Listas para entregar" valor={resumen.listas} href="/servicios?estado=LISTO" />
        <Contador label="Vencidas" valor={resumen.vencidas} href="/servicios?estado=VENCIDAS" alerta />
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
        <SearchInput placeholder="N° de orden, cliente, equipo o serie…" />
        <DateRangeFilter />
        <FilterSelect param="estado" opciones={OPCIONES_ESTADO} todos="Todos los estados" />
        <FilterSelect param="tecnico" opciones={tecnicos} todos="Todos los técnicos" />
      </div>

      <div className="rounded-xl border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>N°</TableHead>
              <TableHead>Recepción</TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead>Equipo</TableHead>
              <TableHead>Técnico</TableHead>
              <TableHead>Prometida</TableHead>
              <TableHead>Estado</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {resultado.items.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                  No se encontraron órdenes de servicio.
                </TableCell>
              </TableRow>
            )}
            {resultado.items.map((o) => (
              <TableRow key={o.id} className={o.estado === "CANCELADO" ? "text-muted-foreground" : undefined}>
                <TableCell>
                  <Link href={`/servicios/${o.id}`} className="font-mono font-medium hover:underline">
                    {o.numero}
                  </Link>
                </TableCell>
                <TableCell>{formatFecha(o.fechaRecepcion)}</TableCell>
                <TableCell className="max-w-56 whitespace-normal">
                  <div className="truncate">{o.cliente}</div>
                  {o.clienteTelefono && <div className="text-xs text-muted-foreground">{o.clienteTelefono}</div>}
                </TableCell>
                <TableCell className="max-w-64 whitespace-normal">
                  <div className="truncate">{o.equipo}</div>
                  {o.marcaModelo && <div className="truncate text-xs text-muted-foreground">{o.marcaModelo}</div>}
                </TableCell>
                <TableCell>{o.tecnico ?? <span className="text-muted-foreground">Sin asignar</span>}</TableCell>
                <TableCell className={o.vencida ? "font-medium text-destructive" : undefined}>{formatFecha(o.fechaPrometida)}</TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1">
                    <EstadoOrdenBadge estado={o.estado} />
                    {o.vencida && <VencidaBadge />}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <PaginationBar page={resultado.page} pageSize={resultado.pageSize} total={resultado.total} />
    </>
  );
}
