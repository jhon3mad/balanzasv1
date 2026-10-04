"use client";

import { useState } from "react";
import { BanIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { MotivoDialog } from "@/components/data/motivo-dialog";
import { formatFechaHora } from "@/lib/dates";
import { aCentimos, deCentimos, formatPEN } from "@/lib/money";
import { anularPagoVentaAction } from "../actions";
import type { PagoVentaDTO } from "../queries";

type Props = {
  pagos: PagoVentaDTO[];
  puedeAnular: boolean;
  /** Texto cuando no hay pagos */
  vacio?: string;
};

export function PagosVentaTable({ pagos, puedeAnular, vacio = "Sin pagos: venta al crédito." }: Props) {
  const [anular, setAnular] = useState<PagoVentaDTO | null>(null);

  if (pagos.length === 0) {
    return <p className="px-6 text-sm text-muted-foreground">{vacio}</p>;
  }

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="pl-6">Fecha</TableHead>
            <TableHead>Método</TableHead>
            <TableHead>N° operación</TableHead>
            <TableHead className="text-right">Recibido</TableHead>
            <TableHead className="text-right">Vuelto</TableHead>
            <TableHead>Registró</TableHead>
            <TableHead className="text-right">Monto</TableHead>
            <TableHead className="w-12 pr-6" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {pagos.map((p) => (
            <TableRow key={p.id} className={p.anulado ? "text-muted-foreground" : undefined}>
              <TableCell className="pl-6">{formatFechaHora(p.fecha)}</TableCell>
              <TableCell>
                {p.metodo}
                {p.anulado && (
                  <Badge variant="destructive" className="ml-2">
                    Anulado
                  </Badge>
                )}
              </TableCell>
              <TableCell className="font-mono text-xs">{p.referencia ?? "—"}</TableCell>
              <TableCell className="text-right tabular-nums">{p.montoRecibido ? formatPEN(p.montoRecibido) : "—"}</TableCell>
              <TableCell className="text-right tabular-nums">
                {p.montoRecibido ? formatPEN(deCentimos(aCentimos(p.montoRecibido) - aCentimos(p.monto))) : "—"}
              </TableCell>
              <TableCell>{p.usuario}</TableCell>
              <TableCell className={p.anulado ? "text-right tabular-nums line-through" : "text-right tabular-nums"}>
                {formatPEN(p.monto)}
              </TableCell>
              <TableCell className="pr-6">
                {puedeAnular && !p.anulado && (
                  <Button variant="ghost" size="icon-sm" aria-label="Anular pago" title="Anular pago" onClick={() => setAnular(p)}>
                    <BanIcon />
                  </Button>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      {pagos.some((p) => p.anulado) && (
        <ul className="mt-3 grid gap-1 px-6 text-xs text-muted-foreground">
          {pagos
            .filter((p) => p.anulado)
            .map((p) => (
              <li key={p.id}>
                Pago de {formatPEN(p.monto)} ({p.metodo}) anulado por {p.anuladoPor ?? "—"} el {formatFechaHora(p.fechaAnulacion)}:{" "}
                {p.motivoAnulacion}
              </li>
            ))}
        </ul>
      )}
      {anular && (
        <MotivoDialog
          titulo="¿Anular este pago?"
          descripcion={`Pago de ${formatPEN(anular.monto)} por ${anular.metodo} del ${formatFechaHora(anular.fecha)}. El saldo de la venta volverá a aumentar; si corresponde, registra luego el pago correcto.`}
          confirmarTexto="Anular pago"
          onConfirm={(motivo) => anularPagoVentaAction({ pagoId: anular.id, motivo })}
          onClose={() => setAnular(null)}
        />
      )}
    </>
  );
}
