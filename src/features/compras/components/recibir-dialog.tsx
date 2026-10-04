"use client";

import { useTransition } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { FormField } from "@/components/form/form-field";
import { hoyLima } from "@/lib/dates";
import { formatPEN } from "@/lib/money";
import { handleActionResult } from "@/lib/notify";
import { recibirCompraAction } from "../actions";
import type { CompraDetalleDTO } from "../queries";
import { recepcionSchema, type RecepcionInput, type RecepcionOutput } from "../schemas";

export function RecibirDialog({ compra, onClose }: { compra: CompraDetalleDTO; onClose: () => void }) {
  const [pending, startTransition] = useTransition();
  const form = useForm<RecepcionInput, unknown, RecepcionOutput>({
    resolver: zodResolver(recepcionSchema),
    defaultValues: {
      compraId: compra.id,
      fechaRecepcion: hoyLima(),
      lineas: compra.detalles.map((d) => ({ detalleId: d.id, cantidadRecibida: String(d.cantidadUnidades) })),
    },
  });
  const { errors } = form.formState;
  const lineas = useWatch({ control: form.control, name: "lineas" });
  const total = compra.detalles.reduce((s, d, i) => {
    const recibida = Number(lineas[i]?.cantidadRecibida) || 0;
    return s + (recibida === d.cantidadUnidades ? Number(d.subtotal) : Number(d.costoUnitario) * recibida);
  }, 0);

  const onSubmit = form.handleSubmit(() => {
    const values = form.getValues();
    startTransition(async () => {
      const result = await recibirCompraAction(values);
      if (handleActionResult(result, form.setError)) onClose();
    });
  });

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-2xl">
        <form onSubmit={onSubmit} noValidate className="grid gap-4">
          <DialogHeader>
            <DialogTitle>Recibir mercadería — {compra.numero}</DialogTitle>
            <DialogDescription>
              Confirma cuántas unidades llegaron. El stock sube con lo recibido y el total de la compra se ajusta.
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-[50vh] overflow-y-auto rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Producto</TableHead>
                  <TableHead className="text-right">Pedido</TableHead>
                  <TableHead className="w-28">Llegó</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {compra.detalles.map((d, i) => {
                  const e = errors.lineas?.[i]?.cantidadRecibida;
                  const recibida = Number(lineas[i]?.cantidadRecibida);
                  return (
                    <TableRow key={d.id} className="align-top">
                      <TableCell className="whitespace-normal">
                        <div className="text-sm font-medium">{d.producto}</div>
                        <div className="text-xs text-muted-foreground">
                          {d.presentacion} · {d.codigo}
                        </div>
                      </TableCell>
                      <TableCell className="pt-3 text-right tabular-nums">{d.cantidadUnidades} und.</TableCell>
                      <TableCell>
                        <Input
                          inputMode="numeric"
                          aria-label={`Unidades recibidas de ${d.producto}`}
                          aria-invalid={!!e}
                          {...form.register(`lineas.${i}.cantidadRecibida`)}
                        />
                        {e && <p className="text-xs text-destructive">{e.message}</p>}
                        {!e && Number.isFinite(recibida) && recibida !== d.cantidadUnidades && (
                          <p className="text-xs text-amber-600 dark:text-amber-400">
                            {recibida < d.cantidadUnidades ? "Llegó incompleto" : "Llegó de más"}
                          </p>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
          {(errors.lineas?.message ?? errors.lineas?.root?.message) && (
            <p className="text-sm text-destructive">{errors.lineas?.message ?? errors.lineas?.root?.message}</p>
          )}
          <div className="flex flex-wrap items-end justify-between gap-4">
            <FormField label="Fecha de recepción" htmlFor="fechaRecepcion" error={errors.fechaRecepcion} className="w-44">
              <Input id="fechaRecepcion" type="date" max={hoyLima()} {...form.register("fechaRecepcion")} />
            </FormField>
            <div className="text-right text-sm">
              Total a pagar por lo recibido
              <div className="text-lg font-semibold tabular-nums">{formatPEN(total)}</div>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={pending}>
              Cancelar
            </Button>
            <Button type="submit" disabled={pending}>
              {pending && <Spinner />}
              Confirmar recepción
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
