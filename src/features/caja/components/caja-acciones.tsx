"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowDownToLineIcon, ArrowUpFromLineIcon, LockIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { MoneyInput } from "@/components/form/money-input";
import type { FieldErrors } from "@/lib/action-result";
import { aCentimos, deCentimos, formatPEN } from "@/lib/money";
import { handleActionResult } from "@/lib/notify";
import { cn } from "@/lib/utils";
import { cerrarCajaAction, movimientoCajaAction } from "../actions";
import type { TipoMovimientoCaja } from "../schemas";

function MovimientoDialog({ tipo, esperado, onClose }: { tipo: TipoMovimientoCaja; esperado: string; onClose: () => void }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [monto, setMonto] = useState("");
  const [concepto, setConcepto] = useState("");
  const [errores, setErrores] = useState<FieldErrors>({});
  const ingreso = tipo === "INGRESO";

  const guardar = () => {
    startTransition(async () => {
      const result = await movimientoCajaAction({ tipo, monto, concepto });
      if (handleActionResult(result)) {
        router.refresh();
        onClose();
      } else setErrores(result.fieldErrors ?? {});
    });
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{ingreso ? "Ingreso de efectivo" : "Retiro de efectivo"}</DialogTitle>
          <DialogDescription>
            {ingreso
              ? "Dinero que entra a la caja y no es una venta (ej. más sencillo)."
              : `Dinero que sale de la caja y no es una devolución (ej. compra de útiles, pago a un proveedor). En caja debería haber ${formatPEN(esperado)}.`}
          </DialogDescription>
        </DialogHeader>
        <FieldGroup>
          <Field data-invalid={!!errores.monto}>
            <FieldLabel htmlFor="monto">Monto</FieldLabel>
            <MoneyInput id="monto" autoFocus value={monto} aria-invalid={!!errores.monto} onChange={(e) => setMonto(e.target.value)} />
            <FieldError>{errores.monto?.[0]}</FieldError>
          </Field>
          <Field data-invalid={!!errores.concepto}>
            <FieldLabel htmlFor="concepto">Concepto</FieldLabel>
            <Input
              id="concepto"
              placeholder={ingreso ? "Ej. Sencillo del banco" : "Ej. Compra de bolsas"}
              value={concepto}
              aria-invalid={!!errores.concepto}
              onChange={(e) => setConcepto(e.target.value)}
            />
            <FieldError>{errores.concepto?.[0]}</FieldError>
          </Field>
        </FieldGroup>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={pending}>
            Cancelar
          </Button>
          <Button onClick={guardar} disabled={pending}>
            {pending && <Spinner />}
            Registrar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function CerrarDialog({ esperado, onClose }: { esperado: string; onClose: () => void }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [contado, setContado] = useState("");
  const [observaciones, setObservaciones] = useState("");
  const [errores, setErrores] = useState<FieldErrors>({});
  const diferencia = contado.trim() === "" ? null : aCentimos(contado) - aCentimos(esperado);

  const cerrar = () => {
    startTransition(async () => {
      const result = await cerrarCajaAction({ efectivoContado: contado, observaciones });
      if (handleActionResult(result)) {
        router.refresh();
        onClose();
      } else setErrores(result.fieldErrors ?? {});
    });
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Cerrar caja</DialogTitle>
          <DialogDescription>Cuenta el efectivo que hay en la caja y anótalo. El sistema calcula si falta o sobra.</DialogDescription>
        </DialogHeader>
        <div className="flex items-baseline justify-between rounded-lg border bg-muted/30 p-3">
          <span className="text-sm text-muted-foreground">Debería haber</span>
          <span className="text-xl font-semibold">{formatPEN(esperado)}</span>
        </div>
        <FieldGroup>
          <Field data-invalid={!!errores.efectivoContado}>
            <FieldLabel htmlFor="contado">Efectivo contado</FieldLabel>
            <MoneyInput
              id="contado"
              autoFocus
              value={contado}
              aria-invalid={!!errores.efectivoContado}
              onChange={(e) => setContado(e.target.value)}
            />
            <FieldError>{errores.efectivoContado?.[0]}</FieldError>
          </Field>
          {diferencia !== null && (
            <div
              className={cn(
                "flex items-baseline justify-between rounded-lg p-3 text-sm",
                diferencia === 0 ? "bg-emerald-500/10" : "bg-destructive/10",
              )}
            >
              <span className="font-medium">{diferencia === 0 ? "Cuadra exacto" : diferencia > 0 ? "Sobra" : "Falta"}</span>
              <span className={cn("text-lg font-semibold tabular-nums", diferencia !== 0 && "text-destructive")}>
                {formatPEN(deCentimos(Math.abs(diferencia)))}
              </span>
            </div>
          )}
          <Field>
            <FieldLabel htmlFor="observaciones">Observaciones (opcional)</FieldLabel>
            <Textarea
              id="observaciones"
              rows={2}
              placeholder={diferencia ? "Explica la diferencia si la conoces" : undefined}
              value={observaciones}
              onChange={(e) => setObservaciones(e.target.value)}
            />
          </Field>
        </FieldGroup>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={pending}>
            Cancelar
          </Button>
          <Button onClick={cerrar} disabled={pending || contado.trim() === ""}>
            {pending && <Spinner />}
            Cerrar caja
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** Botones de la caja abierta: ingreso, retiro y cierre con arqueo. */
export function CajaAcciones({ esperado }: { esperado: string }) {
  const [dialogo, setDialogo] = useState<"INGRESO" | "EGRESO" | "cerrar" | null>(null);
  const cerrar = () => setDialogo(null);
  return (
    <>
      <Button variant="outline" onClick={() => setDialogo("INGRESO")}>
        <ArrowDownToLineIcon />
        Ingreso
      </Button>
      <Button variant="outline" onClick={() => setDialogo("EGRESO")}>
        <ArrowUpFromLineIcon />
        Retiro
      </Button>
      <Button onClick={() => setDialogo("cerrar")}>
        <LockIcon />
        Cerrar caja
      </Button>
      {(dialogo === "INGRESO" || dialogo === "EGRESO") && <MovimientoDialog tipo={dialogo} esperado={esperado} onClose={cerrar} />}
      {dialogo === "cerrar" && <CerrarDialog esperado={esperado} onClose={cerrar} />}
    </>
  );
}
