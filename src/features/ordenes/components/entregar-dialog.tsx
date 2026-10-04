"use client";

import { useState, useTransition } from "react";
import { AlertTriangleIcon } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Field, FieldContent, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { Switch } from "@/components/ui/switch";
import { FormField } from "@/components/form/form-field";
import { MoneyInput } from "@/components/form/money-input";
import { SelectField } from "@/components/form/select-field";
import type { FieldErrors } from "@/lib/action-result";
import { aCentimos, deCentimos, formatPEN } from "@/lib/money";
import { handleActionResult } from "@/lib/notify";
import type { MetodoPagoVenta } from "@/features/ventas/queries";
import { entregarOrdenAction } from "../actions";
import { ESTADO_ORDEN_LABELS } from "../constants";
import type { OrdenDetalleDTO } from "../queries";

type Props = {
  orden: OrdenDetalleDTO;
  metodos: MetodoPagoVenta[];
  puedeCobrar: boolean;
  onClose: () => void;
};

/** Entrega del equipo: emite la boleta y cobra lo que pague el cliente en el acto. */
export function EntregarDialog({ orden, metodos, puedeCobrar, onClose }: Props) {
  const [pending, startTransition] = useTransition();
  const conSaldo = Number(orden.saldo) > 0;
  const inicial = metodos.find((m) => m.esEfectivo) ?? metodos[0];
  const [cobrar, setCobrar] = useState(conSaldo && puedeCobrar);
  const [metodoId, setMetodoId] = useState(inicial ? String(inicial.id) : "");
  const [monto, setMonto] = useState(orden.saldo);
  const [recibido, setRecibido] = useState("");
  const [referencia, setReferencia] = useState("");
  const [errores, setErrores] = useState<FieldErrors>({});
  const error = (k: string) => (errores[k]?.[0] ? { message: errores[k][0] } : undefined);

  const metodo = metodos.find((m) => String(m.id) === metodoId);
  const pagaAhora = cobrar ? aCentimos(monto) : 0;
  const saldoFinal = aCentimos(orden.saldo) - pagaAhora;
  const vuelto = cobrar && metodo?.esEfectivo && recibido.trim() !== "" ? aCentimos(recibido) - aCentimos(monto) : 0;

  const entregar = () => {
    if (cobrar && metodo?.requiereReferencia && !referencia.trim()) {
      setErrores({ "pago.referencia": [`Indica el número de operación de ${metodo.nombre}`] });
      return;
    }
    startTransition(async () => {
      const result = await entregarOrdenAction({
        ordenId: orden.id,
        pago: cobrar
          ? {
              metodoPagoId: Number(metodoId),
              monto,
              montoRecibido: metodo?.esEfectivo ? recibido : "",
              referencia: metodo?.esEfectivo && !metodo.requiereReferencia ? "" : referencia,
            }
          : null,
      });
      if (handleActionResult(result)) onClose();
      else setErrores(result.fieldErrors ?? {});
    });
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Entregar equipo — {orden.numero}</DialogTitle>
          <DialogDescription>Se emitirá la boleta y la orden quedará como entregada.</DialogDescription>
        </DialogHeader>

        {orden.estado !== "LISTO" && (
          <Alert>
            <AlertTriangleIcon />
            <AlertDescription>
              La orden está &quot;{ESTADO_ORDEN_LABELS[orden.estado]}&quot;, no &quot;Listo para entregar&quot;. Entrégala solo si el
              cliente retira el equipo así.
            </AlertDescription>
          </Alert>
        )}

        <div className="grid gap-1 rounded-lg border bg-muted/20 p-3 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Total</span>
            <span className="font-semibold tabular-nums">{formatPEN(orden.total)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Adelantos</span>
            <span className="tabular-nums">{formatPEN(orden.montoPagado)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Saldo</span>
            <span className="tabular-nums">{formatPEN(orden.saldo)}</span>
          </div>
        </div>

        {conSaldo && puedeCobrar && (
          <FieldGroup>
            <Field orientation="horizontal">
              <FieldContent>
                <FieldLabel htmlFor="cobrar">Cobrar ahora</FieldLabel>
                <FieldDescription>Desmarca si el cliente pagará después (queda en cuentas por cobrar).</FieldDescription>
              </FieldContent>
              <Switch id="cobrar" checked={cobrar} onCheckedChange={setCobrar} />
            </Field>
            {cobrar && (
              <div className="grid gap-4 sm:grid-cols-2">
                <FormField label="Método de pago" htmlFor="metodo" error={error("pago.metodoPagoId")}>
                  <SelectField
                    id="metodo"
                    value={metodoId}
                    onChange={(v) => {
                      setMetodoId(v);
                      setRecibido("");
                      setReferencia("");
                    }}
                    opciones={metodos.map((m) => ({ value: String(m.id), label: m.nombre }))}
                  />
                </FormField>
                <FormField label="Monto" htmlFor="monto" error={error("pago.monto")}>
                  <MoneyInput id="monto" value={monto} onChange={(e) => setMonto(e.target.value)} />
                </FormField>
                {metodo?.esEfectivo && (
                  <FormField label="Recibido (opcional)" htmlFor="recibido" error={error("pago.montoRecibido")}>
                    <MoneyInput id="recibido" placeholder={monto} value={recibido} onChange={(e) => setRecibido(e.target.value)} />
                  </FormField>
                )}
                {(!metodo?.esEfectivo || metodo.requiereReferencia) && (
                  <FormField
                    label={metodo?.requiereReferencia ? "N° de operación" : "N° de operación (opcional)"}
                    htmlFor="referencia"
                    error={error("pago.referencia")}
                  >
                    <Input id="referencia" value={referencia} onChange={(e) => setReferencia(e.target.value)} />
                  </FormField>
                )}
              </div>
            )}
          </FieldGroup>
        )}

        <div className="grid gap-1 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">{saldoFinal < 0 ? "Exceso" : "Quedará pendiente"}</span>
            <span className={saldoFinal !== 0 ? "font-medium text-destructive tabular-nums" : "tabular-nums"}>
              {formatPEN(deCentimos(Math.abs(saldoFinal)))}
            </span>
          </div>
          {vuelto > 0 && (
            <div className="flex items-baseline justify-between text-base">
              <span className="font-medium">Vuelto</span>
              <span className="font-semibold text-emerald-600 tabular-nums dark:text-emerald-400">{formatPEN(deCentimos(vuelto))}</span>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={pending}>
            Cancelar
          </Button>
          <Button onClick={entregar} disabled={pending || saldoFinal < 0}>
            {pending && <Spinner />}
            Entregar y emitir boleta
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
