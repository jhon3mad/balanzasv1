"use client";

import { useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { FieldGroup } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { FormField } from "@/components/form/form-field";
import { handleActionResult } from "@/lib/notify";
import { guardarProveedorAction } from "../actions";
import type { ProveedorDTO } from "../queries";
import { proveedorSchema, type ProveedorInput, type ProveedorOutput } from "../schemas";

export function ProveedorDialog({ proveedor, onClose }: { proveedor?: ProveedorDTO; onClose: () => void }) {
  const [pending, startTransition] = useTransition();
  const form = useForm<ProveedorInput, unknown, ProveedorOutput>({
    resolver: zodResolver(proveedorSchema),
    defaultValues: {
      id: proveedor?.id,
      ruc: proveedor?.ruc ?? "",
      razonSocial: proveedor?.razonSocial ?? "",
      contacto: proveedor?.contacto ?? "",
      telefono: proveedor?.telefono ?? "",
      email: proveedor?.email ?? "",
      direccion: proveedor?.direccion ?? "",
      notas: proveedor?.notas ?? "",
    },
  });
  const { errors } = form.formState;

  // Se envían los valores crudos; el servidor vuelve a validar y transformar.
  const onSubmit = form.handleSubmit(() => {
    const values = form.getValues();
    startTransition(async () => {
      const result = await guardarProveedorAction(values);
      if (handleActionResult(result, form.setError)) onClose();
    });
  });

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <form onSubmit={onSubmit} noValidate className="grid gap-4">
          <DialogHeader>
            <DialogTitle>{proveedor ? "Editar proveedor" : "Nuevo proveedor"}</DialogTitle>
          </DialogHeader>
          <FieldGroup>
            <FormField label="Razón social / nombre" htmlFor="prov-razon" error={errors.razonSocial}>
              <Input id="prov-razon" autoFocus aria-invalid={!!errors.razonSocial} {...form.register("razonSocial")} />
            </FormField>
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField label="RUC (opcional)" htmlFor="prov-ruc" error={errors.ruc}>
                <Input
                  id="prov-ruc"
                  inputMode="numeric"
                  maxLength={11}
                  aria-invalid={!!errors.ruc}
                  {...form.register("ruc")}
                />
              </FormField>
              <FormField label="Teléfono / celular" htmlFor="prov-telefono" error={errors.telefono}>
                <Input id="prov-telefono" type="tel" aria-invalid={!!errors.telefono} {...form.register("telefono")} />
              </FormField>
              <FormField label="Persona de contacto" htmlFor="prov-contacto" error={errors.contacto}>
                <Input id="prov-contacto" aria-invalid={!!errors.contacto} {...form.register("contacto")} />
              </FormField>
              <FormField label="Correo" htmlFor="prov-email" error={errors.email}>
                <Input id="prov-email" type="email" aria-invalid={!!errors.email} {...form.register("email")} />
              </FormField>
            </div>
            <FormField label="Dirección" htmlFor="prov-direccion" error={errors.direccion}>
              <Input id="prov-direccion" aria-invalid={!!errors.direccion} {...form.register("direccion")} />
            </FormField>
            <FormField label="Notas" htmlFor="prov-notas" error={errors.notas}>
              <Textarea
                id="prov-notas"
                rows={2}
                placeholder="Ej. Envía por Shalom, demora 3 días"
                {...form.register("notas")}
              />
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
