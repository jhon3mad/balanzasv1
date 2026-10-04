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
import { handleActionResult } from "@/lib/notify";
import { cambiarEstadoUsuarioAction } from "../actions";
import type { UsuarioDTO } from "../queries";

type Props = {
  usuario: UsuarioDTO;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function CambiarEstadoDialog({ usuario, open, onOpenChange }: Props) {
  const [pending, startTransition] = useTransition();
  const activar = !usuario.activo;

  const confirmar = () => {
    startTransition(async () => {
      const result = await cambiarEstadoUsuarioAction({ id: usuario.id, activo: activar });
      if (handleActionResult(result)) onOpenChange(false);
    });
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{activar ? "¿Activar usuario?" : "¿Desactivar usuario?"}</AlertDialogTitle>
          <AlertDialogDescription>
            {activar
              ? `${usuario.name} podrá volver a ingresar al sistema.`
              : `${usuario.name} no podrá ingresar al sistema y se cerrarán sus sesiones abiertas. Su historial (ventas, compras, etc.) se conserva.`}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={pending}>Cancelar</AlertDialogCancel>
          <AlertDialogAction variant={activar ? "default" : "destructive"} onClick={confirmar} disabled={pending}>
            {pending && <Spinner />}
            {activar ? "Activar" : "Desactivar"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
