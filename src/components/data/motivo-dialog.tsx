"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import type { ActionResult } from "@/lib/action-result";
import { handleActionResult } from "@/lib/notify";

type Props = {
  titulo: string;
  descripcion: React.ReactNode;
  confirmarTexto: string;
  onConfirm: (motivo: string) => Promise<ActionResult<unknown>>;
  onClose: () => void;
};

/** Confirmación que exige escribir un motivo (anulaciones). */
export function MotivoDialog({ titulo, descripcion, confirmarTexto, onConfirm, onClose }: Props) {
  const [motivo, setMotivo] = useState("");
  const [error, setError] = useState<string>();
  const [pending, startTransition] = useTransition();

  const confirmar = () => {
    if (!motivo.trim()) {
      setError("Indica el motivo");
      return;
    }
    startTransition(async () => {
      const result = await onConfirm(motivo.trim());
      if (handleActionResult(result)) onClose();
      else setError(result.fieldErrors?.motivo?.[0]);
    });
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{titulo}</DialogTitle>
          <DialogDescription>{descripcion}</DialogDescription>
        </DialogHeader>
        <Field data-invalid={!!error}>
          <FieldLabel htmlFor="motivo">Motivo</FieldLabel>
          <Textarea
            id="motivo"
            rows={3}
            autoFocus
            value={motivo}
            aria-invalid={!!error}
            onChange={(e) => {
              setMotivo(e.target.value);
              setError(undefined);
            }}
          />
          <FieldError>{error}</FieldError>
        </Field>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={pending}>
            Cancelar
          </Button>
          <Button variant="destructive" onClick={confirmar} disabled={pending}>
            {pending && <Spinner />}
            {confirmarTexto}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
