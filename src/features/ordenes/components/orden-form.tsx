"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FieldGroup } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { FormField } from "@/components/form/form-field";
import { MoneyInput } from "@/components/form/money-input";
import { SelectField, type Opcion } from "@/components/form/select-field";
import { fechaInput, hoyLima } from "@/lib/dates";
import { handleActionResult } from "@/lib/notify";
import type { ClienteVentaOpcion } from "@/features/ventas/queries";
import { ClienteSelector } from "@/features/ventas/components/cliente-selector";
import { guardarOrdenAction } from "../actions";
import type { OrdenDetalleDTO } from "../queries";
import { ordenSchema, type OrdenInput, type OrdenOutput } from "../schemas";

function valoresIniciales(orden?: OrdenDetalleDTO): OrdenInput {
  return {
    id: orden?.id,
    clienteId: orden?.clienteId ?? null,
    equipo: orden?.equipo ?? "",
    marca: orden?.marca ?? "",
    modelo: orden?.modelo ?? "",
    numeroSerie: orden?.numeroSerie ?? "",
    accesorios: orden?.accesorios ?? "",
    fallaReportada: orden?.fallaReportada ?? "",
    diagnostico: orden?.diagnostico ?? "",
    presupuesto: orden?.presupuesto ?? "",
    tecnicoId: orden?.tecnicoId ?? "",
    fechaPrometida: orden?.fechaPrometida ? fechaInput(orden.fechaPrometida) : "",
    garantiaDias: orden?.garantiaDias != null ? String(orden.garantiaDias) : "",
    observaciones: orden?.observaciones ?? "",
  };
}

type Props = {
  orden?: OrdenDetalleDTO;
  clientes: ClienteVentaOpcion[];
  tecnicos: Opcion[];
  marcas: string[];
  puedeCrearCliente: boolean;
};

export function OrdenForm({ orden, clientes: iniciales, tecnicos, marcas, puedeCrearCliente }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [clientes, setClientes] = useState(() => {
    // El cliente actual aunque se haya desactivado después
    if (orden && !iniciales.some((c) => c.id === orden.clienteId)) {
      return [
        ...iniciales,
        { id: orden.clienteId, nombre: orden.cliente, documento: orden.clienteDocumento, telefono: orden.clienteTelefono },
      ];
    }
    return iniciales;
  });
  const form = useForm<OrdenInput, unknown, OrdenOutput>({
    resolver: zodResolver(ordenSchema),
    defaultValues: valoresIniciales(orden),
  });
  const { errors } = form.formState;

  const onSubmit = form.handleSubmit(() => {
    const values = form.getValues();
    startTransition(async () => {
      const result = await guardarOrdenAction(values);
      if (handleActionResult(result, form.setError)) {
        router.push(`/servicios/${result.data.id}`);
        router.refresh();
      }
    });
  });

  return (
    <form onSubmit={onSubmit} noValidate className="grid max-w-5xl gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Cliente y equipo</CardTitle>
        </CardHeader>
        <CardContent>
          <FieldGroup>
            <FormField label="Cliente" error={errors.clienteId}>
              <Controller
                control={form.control}
                name="clienteId"
                render={({ field }) => (
                  <ClienteSelector
                    clientes={clientes}
                    value={clientes.find((c) => c.id === field.value) ?? null}
                    onChange={(c) => field.onChange(c?.id ?? null)}
                    onCreado={(c) => setClientes((prev) => [...prev, c].sort((a, b) => a.nombre.localeCompare(b.nombre)))}
                    puedeCrear={puedeCrearCliente}
                    invalid={!!errors.clienteId}
                  />
                )}
              />
            </FormField>
            <div className="grid gap-5 md:grid-cols-2">
              <FormField label="Equipo" htmlFor="equipo" error={errors.equipo} description="Ej. Balanza digital de mostrador 30 kg">
                <Input id="equipo" aria-invalid={!!errors.equipo} {...form.register("equipo")} />
              </FormField>
              <FormField label="Marca (opcional)" htmlFor="marca" error={errors.marca}>
                <Input id="marca" list="marcas-sugeridas" autoComplete="off" {...form.register("marca")} />
                <datalist id="marcas-sugeridas">
                  {marcas.map((m) => (
                    <option key={m} value={m} />
                  ))}
                </datalist>
              </FormField>
              <FormField label="Modelo (opcional)" htmlFor="modelo" error={errors.modelo}>
                <Input id="modelo" {...form.register("modelo")} />
              </FormField>
              <FormField label="N° de serie (opcional)" htmlFor="numeroSerie" error={errors.numeroSerie}>
                <Input id="numeroSerie" {...form.register("numeroSerie")} />
              </FormField>
            </div>
            <FormField
              label="Accesorios que deja (opcional)"
              htmlFor="accesorios"
              error={errors.accesorios}
              description="Ej. adaptador, plato de acero, batería"
            >
              <Input id="accesorios" {...form.register("accesorios")} />
            </FormField>
            <FormField label="Falla reportada por el cliente" htmlFor="fallaReportada" error={errors.fallaReportada}>
              <Textarea id="fallaReportada" rows={3} aria-invalid={!!errors.fallaReportada} {...form.register("fallaReportada")} />
            </FormField>
          </FieldGroup>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Taller</CardTitle>
        </CardHeader>
        <CardContent>
          <FieldGroup>
            <div className="grid gap-5 md:grid-cols-2">
              <FormField label="Técnico (opcional)" htmlFor="tecnicoId" error={errors.tecnicoId}>
                <Controller
                  control={form.control}
                  name="tecnicoId"
                  render={({ field }) => (
                    <SelectField
                      id="tecnicoId"
                      value={field.value}
                      onChange={field.onChange}
                      opciones={tecnicos}
                      opcionVacia="Sin asignar"
                      placeholder="Sin asignar"
                    />
                  )}
                />
              </FormField>
              <FormField label="Fecha prometida (opcional)" htmlFor="fechaPrometida" error={errors.fechaPrometida}>
                <Input
                  id="fechaPrometida"
                  type="date"
                  min={orden ? undefined : hoyLima()}
                  aria-invalid={!!errors.fechaPrometida}
                  {...form.register("fechaPrometida")}
                />
              </FormField>
              <FormField label="Presupuesto (opcional)" htmlFor="presupuesto" error={errors.presupuesto}>
                <MoneyInput id="presupuesto" aria-invalid={!!errors.presupuesto} {...form.register("presupuesto")} />
              </FormField>
              <FormField label="Garantía en días (opcional)" htmlFor="garantiaDias" error={errors.garantiaDias}>
                <Input id="garantiaDias" inputMode="numeric" aria-invalid={!!errors.garantiaDias} {...form.register("garantiaDias")} />
              </FormField>
            </div>
            <FormField label="Diagnóstico (opcional)" htmlFor="diagnostico" error={errors.diagnostico}>
              <Textarea id="diagnostico" rows={3} {...form.register("diagnostico")} />
            </FormField>
            <FormField label="Observaciones (opcional)" htmlFor="observaciones" error={errors.observaciones}>
              <Textarea id="observaciones" rows={2} {...form.register("observaciones")} />
            </FormField>
          </FieldGroup>
        </CardContent>
      </Card>

      <div className="flex justify-end gap-2">
        <Button
          variant="outline"
          nativeButton={false}
          render={<Link href={orden ? `/servicios/${orden.id}` : "/servicios"} />}
        >
          Cancelar
        </Button>
        <Button type="submit" disabled={pending}>
          {pending && <Spinner />}
          {orden ? "Guardar cambios" : "Registrar orden"}
        </Button>
      </div>
    </form>
  );
}
