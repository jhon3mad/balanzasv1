"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import {
  ArrowRightLeftIcon,
  BanIcon,
  HandCoinsIcon,
  PackageCheckIcon,
  PencilIcon,
  ReceiptTextIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { MotivoDialog } from "@/components/data/motivo-dialog";
import { SelectField } from "@/components/form/select-field";
import { handleActionResult } from "@/lib/notify";
import type { MetodoPagoVenta } from "@/features/ventas/queries";
import { CobroDialog } from "@/features/ventas/components/cobro-dialog";
import { CompartirBotones } from "@/features/impresion/components/compartir-botones";
import { cambiarEstadoOrdenAction, cancelarOrdenAction } from "../actions";
import { ESTADO_ORDEN_LABELS, FLUJO_ORDEN, esFinal, estadosPermitidos, type EstadoTaller } from "../constants";
import type { OrdenDetalleDTO } from "../queries";
import { EntregarDialog } from "./entregar-dialog";

type Permisos = { actualizar: boolean; anular: boolean; cobrar: boolean; entregar: boolean };

function CambiarEstadoDialog({ orden, onClose }: { orden: OrdenDetalleDTO; onClose: () => void }) {
  const [pending, startTransition] = useTransition();
  const permitidos = estadosPermitidos(orden.estado);
  const indice = (FLUJO_ORDEN as readonly string[]).indexOf(orden.estado);
  // Por defecto, el siguiente paso del flujo
  const [estado, setEstado] = useState<string>(permitidos.find((e) => FLUJO_ORDEN.indexOf(e) > indice) ?? permitidos[0] ?? "");
  const [nota, setNota] = useState("");
  const [error, setError] = useState<string>();

  const guardar = () => {
    startTransition(async () => {
      const result = await cambiarEstadoOrdenAction({ ordenId: orden.id, estado: estado as EstadoTaller, nota });
      if (handleActionResult(result)) onClose();
      else setError(result.fieldErrors?.estado?.[0] ?? result.fieldErrors?.nota?.[0]);
    });
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Cambiar estado — {orden.numero}</DialogTitle>
          <DialogDescription>Estado actual: {ESTADO_ORDEN_LABELS[orden.estado]}.</DialogDescription>
        </DialogHeader>
        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="estado">Nuevo estado</FieldLabel>
            <SelectField
              id="estado"
              value={estado}
              onChange={setEstado}
              opciones={permitidos.map((e) => ({
                value: e,
                label: FLUJO_ORDEN.indexOf(e) < indice ? `${ESTADO_ORDEN_LABELS[e]} (volver)` : ESTADO_ORDEN_LABELS[e],
              }))}
            />
          </Field>
          <Field data-invalid={!!error}>
            <FieldLabel htmlFor="nota">Nota (opcional)</FieldLabel>
            <Textarea
              id="nota"
              rows={3}
              placeholder={estado === "LISTO" ? "Ej. Se cambió el sensor y se calibró" : "Ej. Falla en la tarjeta principal"}
              value={nota}
              onChange={(e) => {
                setNota(e.target.value);
                setError(undefined);
              }}
            />
            <FieldError>{error}</FieldError>
          </Field>
        </FieldGroup>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={pending}>
            Cancelar
          </Button>
          <Button onClick={guardar} disabled={pending || !estado}>
            {pending && <Spinner />}
            Guardar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function OrdenAcciones({
  orden,
  metodos,
  permisos,
}: {
  orden: OrdenDetalleDTO;
  metodos: MetodoPagoVenta[];
  permisos: Permisos;
}) {
  const [dialogo, setDialogo] = useState<"estado" | "cancelar" | "entregar" | "cobrar" | null>(null);
  const cerrar = () => setDialogo(null);
  const final = esFinal(orden.estado);
  const puedeCancelar = !orden.tieneItems && Number(orden.montoPagado) === 0;
  const conSaldo = Number(orden.saldo) > 0;

  const ticket = (
    <CompartirBotones tipo="orden" id={orden.id} numero={orden.numero} textoImprimir="Ticket" whatsapp={orden.estado !== "CANCELADO"} />
  );
  const cobro = dialogo === "cobrar" && (
    <CobroDialog venta={{ id: orden.ventaId, numero: orden.numero, saldo: orden.saldo, cliente: orden.cliente }} metodos={metodos} onClose={cerrar} />
  );

  if (final) {
    return (
      <>
        {ticket}
        {orden.boleta && (
          <Button variant="outline" nativeButton={false} render={<Link href={`/ventas/${orden.ventaId}`} />}>
            <ReceiptTextIcon />
            Boleta {orden.boleta}
          </Button>
        )}
        {orden.estado === "ENTREGADO" && conSaldo && permisos.cobrar && (
          <Button onClick={() => setDialogo("cobrar")}>
            <HandCoinsIcon />
            Cobrar saldo
          </Button>
        )}
        {cobro}
      </>
    );
  }

  return (
    <>
      {ticket}
      {permisos.anular && (
        <Button
          variant="outline"
          onClick={() => setDialogo("cancelar")}
          disabled={!puedeCancelar}
          title={puedeCancelar ? undefined : "Tiene servicios, repuestos o adelantos"}
        >
          <BanIcon />
          Cancelar orden
        </Button>
      )}
      {permisos.actualizar && (
        <>
          <Button variant="outline" nativeButton={false} render={<Link href={`/servicios/${orden.id}/editar`} />}>
            <PencilIcon />
            Editar
          </Button>
          <Button variant="outline" onClick={() => setDialogo("estado")}>
            <ArrowRightLeftIcon />
            Cambiar estado
          </Button>
        </>
      )}
      {permisos.cobrar && conSaldo && (
        <Button variant="outline" onClick={() => setDialogo("cobrar")}>
          <HandCoinsIcon />
          Adelanto
        </Button>
      )}
      {permisos.entregar && (
        <Button
          onClick={() => setDialogo("entregar")}
          disabled={!orden.tieneItems}
          title={orden.tieneItems ? undefined : "Agrega al menos un servicio antes de entregar"}
        >
          <PackageCheckIcon />
          Entregar
        </Button>
      )}

      {dialogo === "estado" && <CambiarEstadoDialog orden={orden} onClose={cerrar} />}
      {dialogo === "entregar" && <EntregarDialog orden={orden} metodos={metodos} puedeCobrar={permisos.cobrar} onClose={cerrar} />}
      {cobro}
      {dialogo === "cancelar" && (
        <MotivoDialog
          titulo={`¿Cancelar la orden ${orden.numero}?`}
          descripcion="La orden quedará cancelada y no se podrá modificar. Recuerda devolver el equipo al cliente."
          confirmarTexto="Cancelar orden"
          onConfirm={(motivo) => cancelarOrdenAction({ ordenId: orden.id, motivo })}
          onClose={cerrar}
        />
      )}
    </>
  );
}
