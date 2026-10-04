import Link from "next/link";
import { TriangleAlertIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatPEN } from "@/lib/money";
import { TIPO_PRODUCTO_LABELS } from "../constants";
import { resumenCaracteristicas } from "../format";
import type { ProductoListaDTO } from "../queries";

export function ProductosTable({ productos }: { productos: ProductoListaDTO[] }) {
  return (
    <div className="rounded-xl border bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Producto</TableHead>
            <TableHead>Presentaciones</TableHead>
            <TableHead className="text-right">Precio</TableHead>
            <TableHead className="text-right">Stock</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {productos.length === 0 && (
            <TableRow>
              <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                No se encontraron productos.
              </TableCell>
            </TableRow>
          )}
          {productos.map((p) => {
            const activas = p.presentaciones.filter((pr) => pr.activo);
            const precios = activas.map((pr) => Number(pr.precioVenta));
            const min = Math.min(...precios);
            const max = Math.max(...precios);
            const caracteristicas = resumenCaracteristicas(p);
            return (
              <TableRow key={p.id} className={p.activo ? undefined : "opacity-60"}>
                <TableCell className="max-w-md">
                  <Link href={`/productos/${p.id}`} className="font-medium hover:underline">
                    {p.nombre}
                  </Link>
                  <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                    <Badge variant="secondary">{TIPO_PRODUCTO_LABELS[p.tipo]}</Badge>
                    {p.marca && <span>{p.marca}</span>}
                    {caracteristicas && <span className="truncate">· {caracteristicas}</span>}
                    {!p.activo && <Badge variant="destructive">Inactivo</Badge>}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1">
                    {p.presentaciones.map((pr) => (
                      <Badge
                        key={pr.id}
                        variant="outline"
                        className={pr.activo ? "font-mono" : "font-mono line-through opacity-60"}
                        title={`${pr.nombre} · ${formatPEN(pr.precioVenta)} · stock ${pr.stock}`}
                      >
                        {pr.codigo}
                      </Badge>
                    ))}
                  </div>
                </TableCell>
                <TableCell className="text-right whitespace-nowrap tabular-nums">
                  {activas.length === 0 ? "—" : min === max ? formatPEN(min) : `${formatPEN(min)} – ${formatPEN(max)}`}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  <span className={p.stockBajo ? "inline-flex items-center gap-1 font-medium text-destructive" : undefined}>
                    {p.stockBajo && <TriangleAlertIcon className="size-3.5" aria-label="Stock bajo" />}
                    {p.stockTotal}
                  </span>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
