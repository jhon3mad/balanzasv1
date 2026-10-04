"use client";

import { useState, useTransition } from "react";
import { MessageCircleIcon, PrinterIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { notify } from "@/lib/notify";
import { whatsappOrdenAction, whatsappVentaAction, type MensajeWhatsapp } from "../actions";
import { WhatsappDialog } from "./whatsapp-dialog";

type Props = {
  tipo: "venta" | "orden";
  id: number;
  numero: string;
  /** Mostrar el botón de WhatsApp (no en ventas anuladas) */
  whatsapp?: boolean;
  /** Texto del botón de imprimir */
  textoImprimir?: string;
  className?: string;
};

/** Botones "Imprimir" (abre la hoja de impresión en otra pestaña) y "WhatsApp". */
export function CompartirBotones({ tipo, id, numero, whatsapp = true, textoImprimir = "Imprimir", className }: Props) {
  const [pending, startTransition] = useTransition();
  const [datos, setDatos] = useState<MensajeWhatsapp | null>(null);
  const ruta = tipo === "venta" ? `/imprimir/venta/${id}` : `/imprimir/orden/${id}`;

  const preparar = () => {
    startTransition(async () => {
      const r = tipo === "venta" ? await whatsappVentaAction({ ventaId: id }) : await whatsappOrdenAction({ ordenId: id });
      if (r.ok) setDatos(r.data);
      else notify.error(r.message);
    });
  };

  return (
    <>
      <Button variant="outline" className={className} nativeButton={false} render={<a href={ruta} target="_blank" rel="noopener" />}>
        <PrinterIcon />
        {textoImprimir}
      </Button>
      {whatsapp && (
        <Button variant="outline" className={className} onClick={preparar} disabled={pending}>
          {pending ? <Spinner /> : <MessageCircleIcon className="text-[#25D366]" />}
          WhatsApp
        </Button>
      )}
      {datos && (
        <WhatsappDialog
          titulo={tipo === "venta" ? `Enviar boleta ${numero}` : `Enviar orden ${numero}`}
          datos={datos}
          onClose={() => setDatos(null)}
        />
      )}
    </>
  );
}
