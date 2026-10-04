"use client";

import { Controller, useFieldArray, type UseFormReturn } from "react-hook-form";
import { PackagePlusIcon, SparklesIcon, Trash2Icon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldContent, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput } from "@/components/ui/input-group";
import { Switch } from "@/components/ui/switch";
import { FormField } from "@/components/form/form-field";
import { MoneyInput } from "@/components/form/money-input";
import { PREFIJO_CODIGO, type TipoProducto } from "../constants";
import type { PresentacionInput, ProductoInput, ProductoOutput } from "../schemas";

export const PRESENTACION_VACIA: PresentacionInput = {
  nombre: "Estándar",
  codigo: "",
  codigoBarras: "",
  precioVenta: "",
  precioMinimo: "",
  stockMinimo: "0",
  unidadesPorCaja: "",
  activo: true,
  stockInicial: "",
  costoInicial: "",
};

function generarCodigo(tipo: TipoProducto) {
  const aleatorio = crypto.getRandomValues(new Uint32Array(1))[0]!.toString(36).toUpperCase().slice(0, 6);
  return `${PREFIJO_CODIGO[tipo]}-${aleatorio.padStart(6, "0")}`;
}

type Props = {
  form: UseFormReturn<ProductoInput, unknown, ProductoOutput>;
  tipo: TipoProducto;
  puedeStockInicial: boolean;
  /** Datos de solo lectura de las presentaciones ya registradas */
  existentes: Record<number, { stock: number }>;
};

export function PresentacionesFields({ form, tipo, puedeStockInicial, existentes }: Props) {
  // keyName distinto de "id" para no pisar el id real de la presentación
  const { fields, append, remove } = useFieldArray({ control: form.control, name: "presentaciones", keyName: "key" });
  const errores = form.formState.errors.presentaciones;
  const errorGeneral = errores?.message ?? errores?.root?.message;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Presentaciones</CardTitle>
        <CardDescription>
          Cada presentación tiene su propio código, precio y stock. Ej.: la misma balanza en versión angosta (KD-11V) y
          ancha (KD-21V). Si el producto viene en un solo tamaño, deja una sola.
        </CardDescription>
        <CardAction>
          <Button
            type="button"
            variant="outline"
            onClick={() => append({ ...PRESENTACION_VACIA, nombre: fields.length === 0 ? "Estándar" : "" })}
          >
            <PackagePlusIcon />
            Agregar presentación
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent className="grid gap-4">
        {errorGeneral && <p className="text-sm text-destructive">{errorGeneral}</p>}

        {fields.map((field, i) => {
          const e = errores?.[i];
          const id = form.getValues(`presentaciones.${i}.id`);
          const existente = id ? existentes[id] : undefined;
          const pref = `presentacion-${field.key}`;

          return (
            <div key={field.key} className="grid gap-4 rounded-xl border bg-muted/20 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">Presentación {i + 1}</span>
                  {existente ? (
                    <Badge variant="secondary">Stock actual: {existente.stock}</Badge>
                  ) : (
                    <Badge variant="outline">Nueva</Badge>
                  )}
                </div>
                {existente ? (
                  <Controller
                    control={form.control}
                    name={`presentaciones.${i}.activo`}
                    render={({ field: f }) => (
                      <label className="flex items-center gap-2 text-sm">
                        <Switch checked={f.value} onCheckedChange={f.onChange} />
                        {f.value ? "Activa" : "Inactiva"}
                      </label>
                    )}
                  />
                ) : (
                  fields.length > 1 && (
                    <Button type="button" variant="ghost" size="sm" onClick={() => remove(i)}>
                      <Trash2Icon />
                      Quitar
                    </Button>
                  )
                )}
              </div>

              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <FormField label="Nombre" htmlFor={`${pref}-nombre`} error={e?.nombre}>
                  <Input
                    id={`${pref}-nombre`}
                    placeholder="Ej. Estándar, Angosta, Ancha"
                    aria-invalid={!!e?.nombre}
                    {...form.register(`presentaciones.${i}.nombre`)}
                  />
                </FormField>

                <Field data-invalid={!!e?.codigo}>
                  <FieldLabel htmlFor={`${pref}-codigo`}>Código</FieldLabel>
                  <InputGroup>
                    <InputGroupInput
                      id={`${pref}-codigo`}
                      placeholder="Ej. KD-11V"
                      className="uppercase"
                      aria-invalid={!!e?.codigo}
                      {...form.register(`presentaciones.${i}.codigo`)}
                    />
                    <InputGroupAddon align="inline-end">
                      <InputGroupButton
                        size="icon-xs"
                        aria-label="Generar código"
                        title="Generar código"
                        onClick={() =>
                          form.setValue(`presentaciones.${i}.codigo`, generarCodigo(tipo), {
                            shouldValidate: true,
                            shouldDirty: true,
                          })
                        }
                      >
                        <SparklesIcon />
                      </InputGroupButton>
                    </InputGroupAddon>
                  </InputGroup>
                  <FieldDescription>El de la caja; o genera uno.</FieldDescription>
                  <FieldError errors={[e?.codigo]} />
                </Field>

                <FormField
                  label="Código de barras (opcional)"
                  htmlFor={`${pref}-barras`}
                  error={e?.codigoBarras}
                  description="Para el escáner."
                >
                  <Input
                    id={`${pref}-barras`}
                    autoComplete="off"
                    aria-invalid={!!e?.codigoBarras}
                    {...form.register(`presentaciones.${i}.codigoBarras`)}
                  />
                </FormField>

                <FormField label="Precio de venta" htmlFor={`${pref}-precio`} error={e?.precioVenta}>
                  <MoneyInput
                    id={`${pref}-precio`}
                    aria-invalid={!!e?.precioVenta}
                    {...form.register(`presentaciones.${i}.precioVenta`)}
                  />
                </FormField>

                <FormField
                  label="Precio mínimo"
                  htmlFor={`${pref}-minimo`}
                  error={e?.precioMinimo}
                  description="El vendedor no puede vender por debajo."
                >
                  <MoneyInput
                    id={`${pref}-minimo`}
                    aria-invalid={!!e?.precioMinimo}
                    {...form.register(`presentaciones.${i}.precioMinimo`)}
                  />
                </FormField>

                <div className="grid grid-cols-2 gap-4">
                  <FormField label="Stock mínimo" htmlFor={`${pref}-stockmin`} error={e?.stockMinimo}>
                    <Input
                      id={`${pref}-stockmin`}
                      inputMode="numeric"
                      aria-invalid={!!e?.stockMinimo}
                      {...form.register(`presentaciones.${i}.stockMinimo`)}
                    />
                  </FormField>
                  <FormField label="Und. por caja" htmlFor={`${pref}-caja`} error={e?.unidadesPorCaja}>
                    <Input
                      id={`${pref}-caja`}
                      inputMode="numeric"
                      placeholder="—"
                      aria-invalid={!!e?.unidadesPorCaja}
                      {...form.register(`presentaciones.${i}.unidadesPorCaja`)}
                    />
                  </FormField>
                </div>
              </div>

              {!existente && puedeStockInicial && (
                <Field orientation="responsive" className="rounded-lg border border-dashed bg-background p-3">
                  <FieldContent>
                    <FieldLabel>Inventario inicial (opcional)</FieldLabel>
                    <FieldDescription>
                      Si ya tienes unidades en tienda, regístralas aquí. Luego el stock solo cambia con compras, ventas y
                      ajustes.
                    </FieldDescription>
                  </FieldContent>
                  <div className="grid grid-cols-2 gap-3 sm:w-80">
                    <FormField label="Cantidad" htmlFor={`${pref}-stockini`} error={e?.stockInicial}>
                      <Input
                        id={`${pref}-stockini`}
                        inputMode="numeric"
                        placeholder="0"
                        aria-invalid={!!e?.stockInicial}
                        {...form.register(`presentaciones.${i}.stockInicial`)}
                      />
                    </FormField>
                    <FormField label="Costo unitario" htmlFor={`${pref}-costoini`} error={e?.costoInicial}>
                      <MoneyInput
                        id={`${pref}-costoini`}
                        aria-invalid={!!e?.costoInicial}
                        {...form.register(`presentaciones.${i}.costoInicial`)}
                      />
                    </FormField>
                  </div>
                </Field>
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
