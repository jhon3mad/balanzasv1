"use client";

import { useState } from "react";
import Link from "next/link";
import { BanIcon, HandCoinsIcon, PackageCheckIcon, PencilIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MotivoDialog } from "@/components/data/motivo-dialog";
import { anularCompraAction } from "../actions";
import type { CompraDetalleDTO, MetodoPagoOpcion } from "../queries";
import { PagoCompraDialog } from "./pago-compra-dialog";
import { RecibirDialog } from "./recibir-dialog";

type Permisos = { editar: boolean; recibir: boolean; pagar: boolean; anular: boolean };

export function CompraAcciones({
  compra,
  metodos,
  permisos,
}: {
  compra: CompraDetalleDTO;
  metodos: MetodoPagoOpcion[];
  permisos: Permisos;
}) {
  const [dialogo, setDialogo] = useState<"recibir" | "pago" | "anular" | null>(null);
  const cerrar = () => setDialogo(null);
  const pendiente = compra.estado === "PENDIENTE";
  const conSaldo = compra.estado !== "ANULADA" && Number(compra.saldo) > 0;

  return (
    <>
      {pendiente && permisos.editar && (
        <Button variant="outline" nativeButton={false} render={<Link href={`/compras/${compra.id}/editar`} />}>
          <PencilIcon />
          Editar
        </Button>
      )}
      {compra.estado !== "ANULADA" && permisos.anular && (
        <Button variant="outline" onClick={() => setDialogo("anular")}>
          <BanIcon />
          Anular
        </Button>
      )}
      {conSaldo && permisos.pagar && (
        <Button variant={pendiente ? "outline" : "default"} onClick={() => setDialogo("pago")}>
          <HandCoinsIcon />
          Registrar pago
        </Button>
      )}
      {pendiente && permisos.recibir && (
        <Button onClick={() => setDialogo("recibir")}>
          <PackageCheckIcon />
          Recibir mercadería
        </Button>
      )}

      {dialogo === "recibir" && <RecibirDialog compra={compra} onClose={cerrar} />}
      {dialogo === "pago" && <PagoCompraDialog compra={compra} metodos={metodos} onClose={cerrar} />}
      {dialogo === "anular" && (
        <MotivoDialog
          titulo={`¿Anular la compra ${compra.numero}?`}
          descripcion={
            compra.estado === "RECIBIDA"
              ? "Se descontará del stock lo que ingresó con esta compra (si aún está disponible). Si tiene pagos, anúlalos primero."
              : "El pedido quedará anulado. Si tiene pagos, anúlalos primero."
          }
          confirmarTexto="Anular compra"
          onConfirm={(motivo) => anularCompraAction({ compraId: compra.id, motivo })}
          onClose={cerrar}
        />
      )}
    </>
  );
}
