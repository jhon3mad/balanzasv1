"use client";

import { useTransition } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Spinner } from "@/components/ui/spinner";
import type { ActionResult } from "@/lib/action-result";
import { handleActionResult } from "@/lib/notify";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  titulo: string;
  descripcion: React.ReactNode;
  confirmarTexto: string;
  destructivo?: boolean;
  /** Acción a ejecutar; el diálogo se cierra si termina bien. */
  onConfirm: () => Promise<ActionResult<unknown>>;
  onSuccess?: () => void;
};

export function ConfirmDialog({
  open,
  onOpenChange,
  titulo,
  descripcion,
  confirmarTexto,
  destructivo,
  onConfirm,
  onSuccess,
}: Props) {
  const [pending, startTransition] = useTransition();

  const confirmar = () => {
    startTransition(async () => {
      const result = await onConfirm();
      if (handleActionResult(result)) {
        onOpenChange(false);
        onSuccess?.();
      }
    });
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{titulo}</AlertDialogTitle>
          <AlertDialogDescription>{descripcion}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={pending}>Cancelar</AlertDialogCancel>
          <AlertDialogAction variant={destructivo ? "destructive" : "default"} onClick={confirmar} disabled={pending}>
            {pending && <Spinner />}
            {confirmarTexto}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
