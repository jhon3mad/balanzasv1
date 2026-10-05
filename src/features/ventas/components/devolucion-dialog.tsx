"use client";

import { useState, useTransition } from "react";
import { MinusIcon, PlusIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { SelectField } from "@/components/form/select-field";
import type { FieldErrors } from "@/lib/action-result";
import { aCentimos, deCentimos, formatPEN } from "@/lib/money";
import { handleActionResult } from "@/lib/notify";
import { devolucionAction } from "../actions";
import type { MetodoPagoVenta, VentaDetalleDTO } from "../queries";

type Props = { venta: VentaDetalleDTO; metodos: MetodoPagoVenta[]; onClose: () => void };

type Linea = { cantidad: number; reingresa: boolean };

/** Devolución de parte de los productos: cantidades, si vuelven al stock y cómo se devuelve el dinero. */
export function DevolucionDialog({ venta, metodos, onClose }: Props) {
  const [pending, startTransition] = useTransition();
  const disponibles = venta.lineas
    .filter((l) => l.tipoItem === "PRODUCTO")
    .map((l) => ({ ...l, disponible: l.cantidad - l.cantidadDevuelta }))
    .filter((l) => l.disponible > 0);
  const [lineas, setLineas] = useState<Record<number, Linea>>(() =>
    Object.fromEntries(disponibles.map((l) => [l.id, { cantidad: 0, reingresa: true }])),
  );
  const [motivo, setMotivo] = useState("");
  const efectivo = metodos.find((m) => m.esEfectivo) ?? metodos[0];
  const [metodoId, setMetodoId] = useState(efectivo ? String(efectivo.id) : "");
  const [errores, setErrores] = useState<FieldErrors>({});

  const actualizar = (id: number, cambios: Partial<Linea>) => setLineas((prev) => ({ ...prev, [id]: { ...prev[id]!, ...cambios } }));

  // Mismo cálculo que el servidor: si se devuelve todo lo que queda de la línea, se usa su saldo exacto
  const importe = (l: (typeof disponibles)[number], cantidad: number) =>
    cantidad === l.disponible ? aCentimos(l.subtotal) - aCentimos(l.montoDevuelto) : aCentimos(l.precioUnitario) * cantidad;
  const total = disponibles.reduce((s, l) => s + importe(l, lineas[l.id]?.cantidad ?? 0), 0);
  const nuevoTotal = aCentimos(venta.total) - total;
  const reembolso = Math.max(aCentimos(venta.montoPagado) - nuevoTotal, 0);
  const rebajaSaldo = total - reembolso;

  const registrar = () => {
    if (!motivo.trim()) {
      setErrores({ motivo: ["Indica el motivo de la devolución"] });
      return;
    }
    startTransition(async () => {
      const result = await devolucionAction({
        ventaId: venta.id,
        motivo,
        lineas: disponibles.map((l) => ({
          ventaDetalleId: l.id,
          cantidad: String(lineas[l.id]?.cantidad ?? 0),
          reingresaStock: lineas[l.id]?.reingresa ?? true,
        })),
        metodoPagoId: reembolso > 0 && metodoId ? Number(metodoId) : null,
      });
      if (handleActionResult(result)) onClose();
      else setErrores(result.fieldErrors ?? {});
    });
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Devolución — {venta.numero}</DialogTitle>
          <DialogDescription>Elige cuántas unidades devuelve el cliente de cada producto.</DialogDescription>
        </DialogHeader>

        <div className="grid max-h-[45vh] gap-2 overflow-y-auto">
          {disponibles.map((l) => {
            const linea = lineas[l.id] ?? { cantidad: 0, reingresa: true };
            return (
              <div key={l.id} className="grid gap-2 rounded-lg border p-3">
                <div>
                  <div className="text-sm font-medium">{l.descripcion}</div>
                  <div className="text-xs text-muted-foreground">
                    Vendidas {l.cantidad}
                    {l.cantidadDevuelta > 0 && ` · ya devueltas ${l.cantidadDevuelta}`} · a {formatPEN(l.precioUnitario)} c/u
                  </div>
                </div>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-1">
                    <Button
                      variant="outline"
                      size="icon-sm"
                      aria-label="Restar uno"
                      disabled={linea.cantidad <= 0}
                      onClick={() => actualizar(l.id, { cantidad: linea.cantidad - 1 })}
                    >
                      <MinusIcon />
                    </Button>
                    <Input
                      className="h-7 w-14 text-center"
                      inputMode="numeric"
                      aria-label={`Cantidad a devolver de ${l.descripcion}`}
                      value={String(linea.cantidad)}
                      onChange={(e) => actualizar(l.id, { cantidad: Math.min(Number(e.target.value.replace(/\D/g, "")) || 0, l.disponible) })}
                    />
                    <Button
                      variant="outline"
                      size="icon-sm"
                      aria-label="Sumar uno"
                      disabled={linea.cantidad >= l.disponible}
                      onClick={() => actualizar(l.id, { cantidad: linea.cantidad + 1 })}
                    >
                      <PlusIcon />
                    </Button>
                    <span className="ml-1 text-xs text-muted-foreground">de {l.disponible}</span>
                  </div>
                  {linea.cantidad > 0 && <span className="text-sm font-medium tabular-nums">{formatPEN(deCentimos(importe(l, linea.cantidad)))}</span>}
                </div>
                {linea.cantidad > 0 && (
                  <label className="flex items-center gap-2 text-sm">
                    <Checkbox checked={linea.reingresa} onCheckedChange={(v) => actualizar(l.id, { reingresa: v === true })} />
                    Vuelve al stock (en buen estado)
                  </label>
                )}
              </div>
            );
          })}
        </div>
        {errores.lineas && <p className="text-sm text-destructive">{errores.lineas[0]}</p>}

        <div className="grid gap-1 rounded-lg border bg-muted/20 p-3 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Importe devuelto</span>
            <span className="font-medium tabular-nums">{formatPEN(deCentimos(total))}</span>
          </div>
          {rebajaSaldo > 0 && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Se rebaja del saldo pendiente</span>
              <span className="tabular-nums">{formatPEN(deCentimos(rebajaSaldo))}</span>
            </div>
          )}
          <div className="flex items-baseline justify-between text-base">
            <span className="font-medium">Devolver al cliente</span>
            <span className="font-semibold tabular-nums">{formatPEN(deCentimos(reembolso))}</span>
          </div>
        </div>

        {reembolso > 0 && (
          <Field>
            <FieldLabel htmlFor="metodo">El dinero se devuelve por</FieldLabel>
            <SelectField id="metodo" value={metodoId} onChange={setMetodoId} opciones={metodos.map((m) => ({ value: String(m.id), label: m.nombre }))} />
          </Field>
        )}
        <Field data-invalid={!!errores.motivo}>
          <FieldLabel htmlFor="motivo">Motivo</FieldLabel>
          <Textarea
            id="motivo"
            rows={2}
            placeholder="Ej. No era la capacidad que necesitaba"
            value={motivo}
            aria-invalid={!!errores.motivo}
            onChange={(e) => {
              setMotivo(e.target.value);
              setErrores((er) => ({ ...er, motivo: undefined }));
            }}
          />
          <FieldError>{errores.motivo?.[0]}</FieldError>
        </Field>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={pending}>
            Cancelar
          </Button>
          <Button onClick={registrar} disabled={pending || total <= 0}>
            {pending && <Spinner />}
            Registrar devolución
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
