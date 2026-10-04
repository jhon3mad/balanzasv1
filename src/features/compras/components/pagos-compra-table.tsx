"use client";

import { useState } from "react";
import { BanIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { MotivoDialog } from "@/components/data/motivo-dialog";
import { formatFecha } from "@/lib/dates";
import { formatPEN } from "@/lib/money";
import { anularPagoCompraAction } from "../actions";
import type { PagoCompraDTO } from "../queries";

export function PagosCompraTable({ pagos, puedeAnular }: { pagos: PagoCompraDTO[]; puedeAnular: boolean }) {
  const [anular, setAnular] = useState<PagoCompraDTO | null>(null);

  if (pagos.length === 0) {
    return <p className="px-6 text-sm text-muted-foreground">Aún no hay pagos registrados.</p>;
  }

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="pl-6">Fecha</TableHead>
            <TableHead>Método</TableHead>
            <TableHead>N° operación</TableHead>
            <TableHead>Registró</TableHead>
            <TableHead className="text-right">Monto</TableHead>
            <TableHead className="w-12 pr-6" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {pagos.map((p) => (
            <TableRow key={p.id} className={p.anulado ? "text-muted-foreground" : undefined}>
              <TableCell className="pl-6">{formatFecha(p.fecha)}</TableCell>
              <TableCell>
                {p.metodo}
                {p.anulado && (
                  <Badge variant="destructive" className="ml-2" title={p.motivoAnulacion ?? undefined}>
                    Anulado
                  </Badge>
                )}
              </TableCell>
              <TableCell className="font-mono text-xs">{p.referencia ?? "—"}</TableCell>
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
      {anular && (
        <MotivoDialog
          titulo="¿Anular este pago?"
          descripcion={`Pago de ${formatPEN(anular.monto)} por ${anular.metodo} del ${formatFecha(anular.fecha)}. El saldo de la compra volverá a aumentar.`}
          confirmarTexto="Anular pago"
          onConfirm={(motivo) => anularPagoCompraAction({ pagoId: anular.id, motivo })}
          onClose={() => setAnular(null)}
        />
      )}
    </>
  );
}
