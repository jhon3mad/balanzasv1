"use client";

import { useState } from "react";
import { MoreHorizontalIcon, PencilIcon, PowerIcon, PowerOffIcon, Trash2Icon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ConfirmDialog } from "@/components/data/confirm-dialog";
import { cambiarEstadoCatalogoAction, eliminarCatalogoAction } from "../actions";
import type { EntidadCatalogo } from "../schemas";

type Props = {
  entidad: EntidadCatalogo;
  registro: { id: number; nombre: string; activo: boolean; enUso: number };
  onEditar: () => void;
};

/** Menú de acciones de una fila de catálogo: editar, activar/desactivar, eliminar. */
export function CatalogoAcciones({ entidad, registro, onEditar }: Props) {
  const [confirmar, setConfirmar] = useState<"estado" | "eliminar" | null>(null);
  const cerrar = (open: boolean) => {
    if (!open) setConfirmar(null);
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger render={<Button variant="ghost" size="icon-sm" aria-label="Acciones" />}>
          <MoreHorizontalIcon />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuItem onClick={onEditar}>
            <PencilIcon />
            Editar
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setConfirmar("estado")}>
            {registro.activo ? <PowerOffIcon /> : <PowerIcon />}
            {registro.activo ? "Desactivar" : "Activar"}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            variant="destructive"
            disabled={registro.enUso > 0}
            onClick={() => setConfirmar("eliminar")}
          >
            <Trash2Icon />
            {registro.enUso > 0 ? "En uso (no se puede eliminar)" : "Eliminar"}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <ConfirmDialog
        open={confirmar === "estado"}
        onOpenChange={cerrar}
        titulo={registro.activo ? `¿Desactivar "${registro.nombre}"?` : `¿Activar "${registro.nombre}"?`}
        descripcion={
          registro.activo
            ? "Dejará de aparecer en las listas para nuevos registros. Lo ya registrado no cambia."
            : "Volverá a aparecer en las listas para nuevos registros."
        }
        confirmarTexto={registro.activo ? "Desactivar" : "Activar"}
        destructivo={registro.activo}
        onConfirm={() => cambiarEstadoCatalogoAction({ entidad, id: registro.id, activo: !registro.activo })}
      />
      <ConfirmDialog
        open={confirmar === "eliminar"}
        onOpenChange={cerrar}
        titulo={`¿Eliminar "${registro.nombre}"?`}
        descripcion="Esta acción no se puede deshacer."
        confirmarTexto="Eliminar"
        destructivo
        onConfirm={() => eliminarCatalogoAction({ entidad, id: registro.id })}
      />
    </>
  );
}
