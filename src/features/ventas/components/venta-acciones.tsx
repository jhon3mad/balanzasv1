"use client";

import { useState } from "react";
import { BanIcon, HandCoinsIcon, PackageCheckIcon, UserRoundPenIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/data/confirm-dialog";
import { MotivoDialog } from "@/components/data/motivo-dialog";
import { formatPEN } from "@/lib/money";
import { anularVentaAction, entregarVentaAction } from "../actions";
import type { ClienteVentaOpcion, MetodoPagoVenta, VentaDetalleDTO } from "../queries";
import { CambiarClienteDialog } from "./cambiar-cliente-dialog";
import { CobroDialog } from "./cobro-dialog";

type Permisos = { cobrar: boolean; entregar: boolean; anular: boolean; crearCliente: boolean };

export function VentaAcciones({
  venta,
  metodos,
  clientes,
  permisos,
}: {
  venta: VentaDetalleDTO;
  metodos: MetodoPagoVenta[];
  clientes: ClienteVentaOpcion[];
  permisos: Permisos;
}) {
  const [dialogo, setDialogo] = useState<"cobrar" | "entregar" | "cliente" | "anular" | null>(null);
  const cerrar = () => setDialogo(null);
  if (venta.estado !== "EMITIDA") return null;

  const conSaldo = Number(venta.saldo) > 0;
  const porEntregar = venta.estadoEntrega === "PENDIENTE";
  const pagado = Number(venta.montoPagado) > 0;

  return (
    <>
      {permisos.anular && venta.tipo === "VENTA" && (
        <Button variant="outline" onClick={() => setDialogo("anular")}>
          <BanIcon />
          Anular
        </Button>
      )}
      {permisos.cobrar && (
        <Button variant="outline" onClick={() => setDialogo("cliente")}>
          <UserRoundPenIcon />
          {venta.clienteId ? "Cambiar cliente" : "Asignar cliente"}
        </Button>
      )}
      {porEntregar && permisos.entregar && (
        <Button variant={conSaldo ? "outline" : "default"} onClick={() => setDialogo("entregar")}>
          <PackageCheckIcon />
          Marcar entregado
        </Button>
      )}
      {conSaldo && permisos.cobrar && (
        <Button onClick={() => setDialogo("cobrar")}>
          <HandCoinsIcon />
          Cobrar saldo
        </Button>
      )}

      {dialogo === "cobrar" && <CobroDialog venta={venta} metodos={metodos} onClose={cerrar} />}
      {dialogo === "cliente" && (
        <CambiarClienteDialog
          venta={venta}
          clientes={clientes}
          requiereCliente={conSaldo || porEntregar}
          puedeCrearCliente={permisos.crearCliente}
          onClose={cerrar}
        />
      )}
      <ConfirmDialog
        open={dialogo === "entregar"}
        onOpenChange={(open) => !open && cerrar()}
        titulo={`¿Entregar la venta ${venta.numero}?`}
        descripcion={
          conSaldo
            ? `Atención: la venta aún tiene un saldo pendiente de ${formatPEN(venta.saldo)}. Se registrará la entrega igualmente.`
            : "Se registrará que el cliente recibió los productos."
        }
        confirmarTexto="Marcar entregado"
        onConfirm={() => entregarVentaAction({ ventaId: venta.id })}
      />
      {dialogo === "anular" && (
        <MotivoDialog
          titulo={`¿Anular la venta ${venta.numero}?`}
          descripcion={
            <>
              Los productos volverán al stock y se anularán los pagos.
              {pagado && (
                <>
                  {" "}
                  Deberás devolver al cliente <strong>{formatPEN(venta.montoPagado)}</strong>.
                </>
              )}{" "}
              Esta acción no se puede deshacer.
            </>
          }
          confirmarTexto="Anular venta"
          onConfirm={(motivo) => anularVentaAction({ ventaId: venta.id, motivo })}
          onClose={cerrar}
        />
      )}
    </>
  );
}
