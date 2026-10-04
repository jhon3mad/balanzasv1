"use client";

import { useTransition } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { handleActionResult } from "@/lib/notify";
import { guardarConfiguracionAction } from "../actions";
import {
  configuracionSchema,
  FORMATO_TICKET_LABELS,
  FORMATOS_TICKET,
  type ConfiguracionInput,
  type ConfiguracionOutput,
} from "../schemas";
import { LogoInput } from "./logo-input";

export function ConfiguracionForm({ valores }: { valores: ConfiguracionInput }) {
  const [pending, startTransition] = useTransition();
  const form = useForm<ConfiguracionInput, unknown, ConfiguracionOutput>({
    resolver: zodResolver(configuracionSchema),
    defaultValues: valores,
  });
  const { errors, isDirty } = form.formState;

  // Se envían los valores del formulario (sin transformar); el servidor vuelve a validarlos.
  const onSubmit = form.handleSubmit(() => {
    const values = form.getValues();
    startTransition(async () => {
      const result = await guardarConfiguracionAction(values);
      if (handleActionResult(result, form.setError)) form.reset(values);
    });
  });

  return (
    <form onSubmit={onSubmit} noValidate>
      <Card>
        <CardHeader>
          <CardTitle>Datos de la tienda</CardTitle>
          <CardDescription>Aparecen en el sistema y en los comprobantes impresos.</CardDescription>
        </CardHeader>
        <CardContent>
          <FieldGroup>
            <Field data-invalid={!!errors.logoUrl}>
              <FieldLabel>Logo</FieldLabel>
              <Controller
                control={form.control}
                name="logoUrl"
                render={({ field }) => (
                  <LogoInput
                    value={field.value}
                    onChange={(v) => field.onChange(v)}
                    invalid={!!errors.logoUrl}
                  />
                )}
              />
              <FieldError errors={[errors.logoUrl]} />
            </Field>

            <div className="grid gap-5 md:grid-cols-2">
              <Field data-invalid={!!errors.nombreComercial}>
                <FieldLabel htmlFor="nombreComercial">Nombre comercial</FieldLabel>
                <Input id="nombreComercial" aria-invalid={!!errors.nombreComercial} {...form.register("nombreComercial")} />
                <FieldError errors={[errors.nombreComercial]} />
              </Field>
              <Field data-invalid={!!errors.razonSocial}>
                <FieldLabel htmlFor="razonSocial">Razón social</FieldLabel>
                <Input id="razonSocial" aria-invalid={!!errors.razonSocial} {...form.register("razonSocial")} />
                <FieldError errors={[errors.razonSocial]} />
              </Field>
              <Field data-invalid={!!errors.ruc}>
                <FieldLabel htmlFor="ruc">RUC</FieldLabel>
                <Input id="ruc" inputMode="numeric" maxLength={11} aria-invalid={!!errors.ruc} {...form.register("ruc")} />
                <FieldError errors={[errors.ruc]} />
              </Field>
              <Field data-invalid={!!errors.telefono}>
                <FieldLabel htmlFor="telefono">Teléfono / celular</FieldLabel>
                <Input id="telefono" type="tel" aria-invalid={!!errors.telefono} {...form.register("telefono")} />
                <FieldError errors={[errors.telefono]} />
              </Field>
              <Field data-invalid={!!errors.direccion} className="md:col-span-2">
                <FieldLabel htmlFor="direccion">Dirección</FieldLabel>
                <Input id="direccion" aria-invalid={!!errors.direccion} {...form.register("direccion")} />
                <FieldError errors={[errors.direccion]} />
              </Field>
              <Field data-invalid={!!errors.email}>
                <FieldLabel htmlFor="email">Correo</FieldLabel>
                <Input id="email" type="email" aria-invalid={!!errors.email} {...form.register("email")} />
                <FieldError errors={[errors.email]} />
              </Field>
            </div>
          </FieldGroup>
        </CardContent>

        <CardHeader className="border-t pt-6">
          <CardTitle>Comprobante e impresión</CardTitle>
          <CardDescription>Cómo se verá el comprobante de venta al imprimirlo.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-5 md:grid-cols-2">
            <Field data-invalid={!!errors.tituloComprobante}>
              <FieldLabel htmlFor="tituloComprobante">Título del comprobante</FieldLabel>
              <Input
                id="tituloComprobante"
                aria-invalid={!!errors.tituloComprobante}
                {...form.register("tituloComprobante")}
              />
              <FieldDescription>Ej. &quot;BOLETA DE VENTA&quot; o &quot;NOTA DE VENTA&quot;.</FieldDescription>
              <FieldError errors={[errors.tituloComprobante]} />
            </Field>
            <Field data-invalid={!!errors.formatoTicket}>
              <FieldLabel htmlFor="formatoTicket">Formato de impresión</FieldLabel>
              <Controller
                control={form.control}
                name="formatoTicket"
                render={({ field }) => (
                  <Select
                    items={FORMATO_TICKET_LABELS}
                    value={field.value}
                    onValueChange={(v) => {
                      if (v) field.onChange(v);
                    }}
                  >
                    <SelectTrigger id="formatoTicket" className="w-full" aria-invalid={!!errors.formatoTicket}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {FORMATOS_TICKET.map((f) => (
                        <SelectItem key={f} value={f}>
                          {FORMATO_TICKET_LABELS[f]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              <FieldDescription>Según la impresora: térmica de 58 mm / 80 mm o impresora normal.</FieldDescription>
              <FieldError errors={[errors.formatoTicket]} />
            </Field>
            <Field data-invalid={!!errors.piePagina} className="md:col-span-2">
              <FieldLabel htmlFor="piePagina">Pie del comprobante</FieldLabel>
              <Textarea
                id="piePagina"
                rows={3}
                placeholder="Ej. ¡Gracias por su compra! Garantía de 6 meses en balanzas."
                aria-invalid={!!errors.piePagina}
                {...form.register("piePagina")}
              />
              <FieldError errors={[errors.piePagina]} />
            </Field>
          </div>
        </CardContent>
        <CardFooter className="justify-end gap-2 border-t">
          <Button type="button" variant="outline" disabled={!isDirty || pending} onClick={() => form.reset()}>
            Descartar cambios
          </Button>
          <Button type="submit" disabled={!isDirty || pending}>
            {pending && <Spinner />}
            Guardar configuración
          </Button>
        </CardFooter>
      </Card>
    </form>
  );
}
