"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { PencilIcon, PowerIcon, PowerOffIcon, Trash2Icon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/data/confirm-dialog";
import { cambiarEstadoProductoAction, eliminarProductoAction } from "../actions";

type Props = {
  producto: { id: number; nombre: string; activo: boolean };
  puedeEditar: boolean;
  puedeEliminar: boolean;
  tieneHistorial: boolean;
};

export function ProductoAcciones({ producto, puedeEditar, puedeEliminar, tieneHistorial }: Props) {
  const router = useRouter();
  const [confirmar, setConfirmar] = useState<"estado" | "eliminar" | null>(null);
  const cerrar = (open: boolean) => {
    if (!open) setConfirmar(null);
  };

  return (
    <>
      {puedeEditar && (
        <>
          <Button variant="outline" onClick={() => setConfirmar("estado")}>
            {producto.activo ? <PowerOffIcon /> : <PowerIcon />}
            {producto.activo ? "Desactivar" : "Activar"}
          </Button>
          <Button nativeButton={false} render={<Link href={`/productos/${producto.id}/editar`} />}>
            <PencilIcon />
            Editar
          </Button>
        </>
      )}
      {puedeEliminar && !tieneHistorial && (
        <Button variant="destructive" onClick={() => setConfirmar("eliminar")}>
          <Trash2Icon />
          Eliminar
        </Button>
      )}

      <ConfirmDialog
        open={confirmar === "estado"}
        onOpenChange={cerrar}
        titulo={producto.activo ? "¿Desactivar producto?" : "¿Activar producto?"}
        descripcion={
          producto.activo
            ? `"${producto.nombre}" ya no aparecerá para vender ni comprar. Su historial se conserva.`
            : `"${producto.nombre}" volverá a estar disponible.`
        }
        confirmarTexto={producto.activo ? "Desactivar" : "Activar"}
        destructivo={producto.activo}
        onConfirm={() => cambiarEstadoProductoAction({ id: producto.id, activo: !producto.activo })}
      />
      <ConfirmDialog
        open={confirmar === "eliminar"}
        onOpenChange={cerrar}
        titulo="¿Eliminar producto?"
        descripcion={`Se eliminará "${producto.nombre}" con todas sus presentaciones. Esta acción no se puede deshacer.`}
        confirmarTexto="Eliminar"
        destructivo
        onConfirm={() => eliminarProductoAction({ id: producto.id })}
        onSuccess={() => router.replace("/productos")}
      />
    </>
  );
}
