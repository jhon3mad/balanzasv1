"use client";

import { useTransition } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { FieldGroup } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { FormField } from "@/components/form/form-field";
import { SelectField } from "@/components/form/select-field";
import { handleActionResult } from "@/lib/notify";
import { guardarClienteAction, type ClienteGuardado } from "../actions";
import type { ClienteDTO } from "../queries";
import { clienteSchema, TIPO_DOCUMENTO_LABELS, TIPOS_DOCUMENTO, type ClienteInput, type ClienteOutput } from "../schemas";

const OPCIONES_DOCUMENTO = TIPOS_DOCUMENTO.map((t) => ({ value: t, label: TIPO_DOCUMENTO_LABELS[t] }));
const MAX_DOCUMENTO: Record<string, number> = { DNI: 8, RUC: 11, CE: 12, PASAPORTE: 12, OTRO: 20 };

type Props = {
  cliente?: ClienteDTO;
  /** Nombre sugerido al crear desde una búsqueda */
  nombreInicial?: string;
  onClose: () => void;
  /** Se llama con el cliente guardado (para usarlo, por ejemplo, en una venta) */
  onSaved?: (cliente: ClienteGuardado) => void;
};

export function ClienteDialog({ cliente, nombreInicial, onClose, onSaved }: Props) {
  const [pending, startTransition] = useTransition();
  const form = useForm<ClienteInput, unknown, ClienteOutput>({
    resolver: zodResolver(clienteSchema),
    defaultValues: {
      id: cliente?.id,
      tipoDocumento: cliente?.tipoDocumento ?? "",
      numeroDocumento: cliente?.numeroDocumento ?? "",
      nombre: cliente?.nombre ?? nombreInicial ?? "",
      telefono: cliente?.telefono ?? "",
      direccion: cliente?.direccion ?? "",
      email: cliente?.email ?? "",
      notas: cliente?.notas ?? "",
    },
  });
  const { errors } = form.formState;
  const tipo = useWatch({ control: form.control, name: "tipoDocumento" });

  const onSubmit = form.handleSubmit(() => {
    const values = form.getValues();
    startTransition(async () => {
      const result = await guardarClienteAction(values);
      if (handleActionResult(result, form.setError)) {
        onSaved?.(result.data);
        onClose();
      }
    });
  });

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <form onSubmit={onSubmit} noValidate className="grid gap-4">
          <DialogHeader>
            <DialogTitle>{cliente ? "Editar cliente" : "Nuevo cliente"}</DialogTitle>
            <DialogDescription>Solo el nombre es obligatorio; para ventas al crédito anota también el celular.</DialogDescription>
          </DialogHeader>
          <FieldGroup>
            <FormField label="Nombre o razón social" htmlFor="cli-nombre" error={errors.nombre}>
              <Input id="cli-nombre" autoFocus aria-invalid={!!errors.nombre} {...form.register("nombre")} />
            </FormField>
            <div className="grid gap-4 sm:grid-cols-[11rem_1fr]">
              <FormField label="Documento" htmlFor="cli-tipodoc" error={errors.tipoDocumento}>
                <Controller
                  control={form.control}
                  name="tipoDocumento"
                  render={({ field }) => (
                    <SelectField
                      id="cli-tipodoc"
                      value={field.value}
                      onChange={(v) => {
                        field.onChange(v);
                        if (!v) form.setValue("numeroDocumento", "");
                      }}
                      opciones={OPCIONES_DOCUMENTO}
                      opcionVacia="Sin documento"
                      placeholder="Sin documento"
                      invalid={!!errors.tipoDocumento}
                    />
                  )}
                />
              </FormField>
              <FormField label="Número" htmlFor="cli-numdoc" error={errors.numeroDocumento}>
                <Input
                  id="cli-numdoc"
                  disabled={!tipo}
                  inputMode={tipo === "DNI" || tipo === "RUC" ? "numeric" : "text"}
                  maxLength={tipo ? MAX_DOCUMENTO[tipo] : undefined}
                  aria-invalid={!!errors.numeroDocumento}
                  {...form.register("numeroDocumento")}
                />
              </FormField>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField label="Celular" htmlFor="cli-telefono" error={errors.telefono}>
                <Input id="cli-telefono" type="tel" aria-invalid={!!errors.telefono} {...form.register("telefono")} />
              </FormField>
              <FormField label="Correo" htmlFor="cli-email" error={errors.email}>
                <Input id="cli-email" type="email" aria-invalid={!!errors.email} {...form.register("email")} />
              </FormField>
            </div>
            <FormField label="Dirección" htmlFor="cli-direccion" error={errors.direccion}>
              <Input id="cli-direccion" aria-invalid={!!errors.direccion} {...form.register("direccion")} />
            </FormField>
            <FormField label="Notas" htmlFor="cli-notas" error={errors.notas}>
              <Textarea id="cli-notas" rows={2} placeholder="Ej. Puesto 45 del mercado central" {...form.register("notas")} />
            </FormField>
          </FieldGroup>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={pending}>
              Cancelar
            </Button>
            <Button type="submit" disabled={pending}>
              {pending && <Spinner />}
              Guardar
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
