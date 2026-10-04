"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Spinner } from "@/components/ui/spinner";
import { handleActionResult } from "@/lib/notify";
import { cambiarClienteVentaAction } from "../actions";
import type { ClienteVentaOpcion } from "../queries";
import { ClienteSelector } from "./cliente-selector";

type Props = {
  venta: { id: number; numero: string; clienteId: number | null };
  clientes: ClienteVentaOpcion[];
  /** Con saldo o entrega pendiente no se permite "Cliente general" */
  requiereCliente: boolean;
  puedeCrearCliente: boolean;
  onClose: () => void;
};

export function CambiarClienteDialog({ venta, clientes: iniciales, requiereCliente, puedeCrearCliente, onClose }: Props) {
  const [pending, startTransition] = useTransition();
  const [clientes, setClientes] = useState(iniciales);
  const [cliente, setCliente] = useState<ClienteVentaOpcion | null>(
    () => iniciales.find((c) => c.id === venta.clienteId) ?? null,
  );
  const faltaCliente = requiereCliente && !cliente;

  const guardar = () => {
    startTransition(async () => {
      const result = await cambiarClienteVentaAction({ ventaId: venta.id, clienteId: cliente?.id ?? null });
      if (handleActionResult(result)) onClose();
    });
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Cliente de la venta {venta.numero}</DialogTitle>
          <DialogDescription>
            {requiereCliente
              ? "La venta tiene saldo o entrega pendiente, así que el cliente es obligatorio."
              : "Deja el campo vacío para registrarla como Cliente general."}
          </DialogDescription>
        </DialogHeader>
        <ClienteSelector
          clientes={clientes}
          value={cliente}
          onChange={setCliente}
          onCreado={(c) => setClientes((prev) => [...prev, c].sort((a, b) => a.nombre.localeCompare(b.nombre)))}
          puedeCrear={puedeCrearCliente}
          invalid={faltaCliente}
        />
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={pending}>
            Cancelar
          </Button>
          <Button onClick={guardar} disabled={pending || faltaCliente || (cliente?.id ?? null) === venta.clienteId}>
            {pending && <Spinner />}
            Guardar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
