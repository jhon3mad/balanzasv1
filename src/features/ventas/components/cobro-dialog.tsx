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
import { aCentimos, deCentimos, formatPEN } from "@/lib/money";
import { handleActionResult } from "@/lib/notify";
import { cobrarVentaAction } from "../actions";
import type { MetodoPagoVenta } from "../queries";
import { cobroSchema, type CobroInput, type CobroOutput } from "../schemas";

type Props = {
  venta: { id: number; numero: string; saldo: string; cliente: string | null };
  metodos: MetodoPagoVenta[];
  onClose: () => void;
};

export function CobroDialog({ venta, metodos, onClose }: Props) {
  const [pending, startTransition] = useTransition();
  const inicial = metodos.find((m) => m.esEfectivo) ?? metodos[0];
  const form = useForm<CobroInput, unknown, CobroOutput>({
    resolver: zodResolver(cobroSchema),
    defaultValues: {
      ventaId: venta.id,
      metodoPagoId: inicial ? String(inicial.id) : "",
      monto: venta.saldo,
      montoRecibido: "",
      referencia: "",
    },
  });
  const { errors } = form.formState;
  const [metodoId, monto, recibido] = useWatch({ control: form.control, name: ["metodoPagoId", "monto", "montoRecibido"] });
  const metodo = metodos.find((m) => String(m.id) === metodoId);
  // Efectivo lleva "recibido" (vuelto); los demás métodos, n° de operación
  const conReferencia = !metodo?.esEfectivo || metodo.requiereReferencia;
  const vuelto = metodo?.esEfectivo && recibido.trim() !== "" ? aCentimos(recibido) - aCentimos(monto) : 0;
  const saldoRestante = aCentimos(venta.saldo) - aCentimos(monto);

  const onSubmit = form.handleSubmit(() => {
    const values = form.getValues();
    if (metodo?.requiereReferencia && !values.referencia.trim()) {
      form.setError("referencia", { message: `Indica el número de operación de ${metodo.nombre}` });
      return;
    }
    startTransition(async () => {
      const result = await cobrarVentaAction({
        ...values,
        montoRecibido: metodo?.esEfectivo ? values.montoRecibido : "",
        referencia: conReferencia ? values.referencia : "",
      });
      if (handleActionResult(result, form.setError)) onClose();
    });
  });

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <form onSubmit={onSubmit} noValidate className="grid gap-4">
          <DialogHeader>
            <DialogTitle>Cobrar — {venta.numero}</DialogTitle>
            <DialogDescription>
              {venta.cliente ?? "Cliente general"} · Saldo pendiente: {formatPEN(venta.saldo)}
            </DialogDescription>
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
              {metodo?.esEfectivo && (
                <FormField label="Recibido (opcional)" htmlFor="montoRecibido" error={errors.montoRecibido}>
                  <MoneyInput
                    id="montoRecibido"
                    placeholder={monto}
                    aria-invalid={!!errors.montoRecibido}
                    {...form.register("montoRecibido")}
                  />
                </FormField>
              )}
              {conReferencia && (
                <FormField
                  label={metodo?.requiereReferencia ? "N° de operación" : "N° de operación (opcional)"}
                  htmlFor="referencia"
                  error={errors.referencia}
                >
                  <Input id="referencia" aria-invalid={!!errors.referencia} {...form.register("referencia")} />
                </FormField>
              )}
            </div>
          </FieldGroup>

          <div className="grid gap-1 rounded-lg border bg-muted/20 p-3 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">{saldoRestante < 0 ? "Exceso" : "Saldo después del pago"}</span>
              <span className={saldoRestante !== 0 ? "font-medium tabular-nums text-destructive" : "tabular-nums"}>
                {formatPEN(deCentimos(Math.abs(saldoRestante)))}
              </span>
            </div>
            {vuelto > 0 && (
              <div className="flex items-baseline justify-between text-base">
                <span className="font-medium">Vuelto</span>
                <span className="font-semibold text-emerald-600 tabular-nums dark:text-emerald-400">
                  {formatPEN(deCentimos(vuelto))}
                </span>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={pending}>
              Cancelar
            </Button>
            <Button type="submit" disabled={pending || saldoRestante < 0}>
              {pending && <Spinner />}
              Registrar pago
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
