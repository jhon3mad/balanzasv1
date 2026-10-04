"use client";

import { useState } from "react";
import { InfoIcon, MessageCircleIcon } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { enlaceWhatsapp, normalizarCelular } from "@/lib/whatsapp";
import type { MensajeWhatsapp } from "../actions";

type Props = { titulo: string; datos: MensajeWhatsapp; onClose: () => void };

/** Pide el celular, muestra el mensaje (editable) y abre WhatsApp listo para enviar. */
export function WhatsappDialog({ titulo, datos, onClose }: Props) {
  const [celular, setCelular] = useState(datos.telefono ?? "");
  const [texto, setTexto] = useState(datos.texto);
  const [error, setError] = useState<string>();

  const abrir = () => {
    const numero = celular.trim() ? normalizarCelular(celular) : null;
    if (celular.trim() && !numero) {
      setError("Ingresa un celular válido de 9 dígitos (o con +código de país)");
      return;
    }
    window.open(enlaceWhatsapp(numero, texto), "_blank", "noopener");
    onClose();
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{titulo}</DialogTitle>
          <DialogDescription>Se abrirá WhatsApp con el mensaje listo; solo presiona Enviar.</DialogDescription>
        </DialogHeader>
        <FieldGroup>
          <Field data-invalid={!!error}>
            <FieldLabel htmlFor="celular">Celular del cliente</FieldLabel>
            <Input
              id="celular"
              inputMode="tel"
              autoFocus
              placeholder="987 654 321"
              value={celular}
              aria-invalid={!!error}
              onChange={(e) => {
                setCelular(e.target.value);
                setError(undefined);
              }}
            />
            <FieldDescription>Déjalo vacío para elegir el contacto dentro de WhatsApp.</FieldDescription>
            <FieldError>{error}</FieldError>
          </Field>
          <Field>
            <FieldLabel htmlFor="mensaje">Mensaje</FieldLabel>
            <Textarea id="mensaje" rows={10} className="font-mono text-xs" value={texto} onChange={(e) => setTexto(e.target.value)} />
          </Field>
          {!datos.enlace && (
            <Alert>
              <InfoIcon />
              <AlertDescription>
                El sistema aún no está publicado en internet, así que se enviará solo el texto, sin el enlace para ver o
                descargar la boleta.
              </AlertDescription>
            </Alert>
          )}
        </FieldGroup>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={abrir} className="bg-[#25D366] text-white hover:bg-[#1ebe5b]">
            <MessageCircleIcon />
            Abrir WhatsApp
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
