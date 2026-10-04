"use client";

import { useTransition } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { FieldGroup } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { FormField } from "@/components/form/form-field";
import { MoneyInput } from "@/components/form/money-input";
import { SelectField } from "@/components/form/select-field";
import { hoyLima } from "@/lib/dates";
import { formatPEN } from "@/lib/money";
import { handleActionResult } from "@/lib/notify";
import { registrarPagoCompraAction } from "../actions";
import type { MetodoPagoOpcion } from "../queries";
import { pagoCompraSchema, type PagoCompraInput, type PagoCompraOutput } from "../schemas";

type Props = {
  compra: { id: number; numero: string; saldo: string };
  metodos: MetodoPagoOpcion[];
  onClose: () => void;
};

export function PagoCompraDialog({ compra, metodos, onClose }: Props) {
  const [pending, startTransition] = useTransition();
  const form = useForm<PagoCompraInput, unknown, PagoCompraOutput>({
    resolver: zodResolver(pagoCompraSchema),
    defaultValues: {
      compraId: compra.id,
      metodoPagoId: metodos[0] ? String(metodos[0].id) : "",
      monto: compra.saldo,
      referencia: "",
      fecha: hoyLima(),
    },
  });
  const { errors } = form.formState;
  const metodoId = useWatch({ control: form.control, name: "metodoPagoId" });
  const metodo = metodos.find((m) => String(m.id) === metodoId);

  const onSubmit = form.handleSubmit(() => {
    const values = form.getValues();
    if (metodo?.requiereReferencia && !values.referencia.trim()) {
      form.setError("referencia", { message: `Indica el número de operación de ${metodo.nombre}` });
      return;
    }
    startTransition(async () => {
      const result = await registrarPagoCompraAction(values);
      if (handleActionResult(result, form.setError)) onClose();
    });
  });

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <form onSubmit={onSubmit} noValidate className="grid gap-4">
          <DialogHeader>
            <DialogTitle>Pago al proveedor — {compra.numero}</DialogTitle>
            <DialogDescription>Saldo pendiente: {formatPEN(compra.saldo)}</DialogDescription>
          </DialogHeader>
          <FieldGroup>
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField label="Método de pago" htmlFor="metodoPagoId" error={errors.metodoPagoId}>
                <Controller
                  control={form.control}
                  name="metodoPagoId"
                  render={({ field }) => (
                    <SelectField
                      id="metodoPagoId"
                      value={field.value}
                      onChange={field.onChange}
                      opciones={metodos.map((m) => ({ value: String(m.id), label: m.nombre }))}
                      invalid={!!errors.metodoPagoId}
                    />
                  )}
                />
              </FormField>
              <FormField label="Monto" htmlFor="monto" error={errors.monto}>
                <MoneyInput id="monto" autoFocus aria-invalid={!!errors.monto} {...form.register("monto")} />
              </FormField>
              <FormField
                label={metodo?.requiereReferencia ? "N° de operación" : "N° de operación (opcional)"}
                htmlFor="referencia"
                error={errors.referencia}
              >
                <Input id="referencia" aria-invalid={!!errors.referencia} {...form.register("referencia")} />
              </FormField>
              <FormField label="Fecha" htmlFor="fecha" error={errors.fecha}>
                <Input id="fecha" type="date" max={hoyLima()} {...form.register("fecha")} />
              </FormField>
            </div>
          </FieldGroup>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={pending}>
              Cancelar
            </Button>
            <Button type="submit" disabled={pending}>
              {pending && <Spinner />}
              Registrar pago
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
