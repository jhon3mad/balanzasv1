"use client";

import { useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Controller, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { WandSparklesIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput } from "@/components/ui/input-group";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { FormField } from "@/components/form/form-field";
import { UnitInput } from "@/components/form/money-input";
import { SelectField } from "@/components/form/select-field";
import { handleActionResult } from "@/lib/notify";
import { cn } from "@/lib/utils";
import { guardarProductoAction } from "../actions";
import {
  CAMPOS_POR_TIPO,
  FUNCIONAMIENTO_LABELS,
  FUNCIONAMIENTOS,
  TIPO_ENCHUFE_LABELS,
  TIPO_PRODUCTO_LABELS,
  TIPOS_ENCHUFE,
  TIPOS_PRODUCTO,
  type Funcionamiento,
  type TipoEnchufe,
} from "../constants";
import { sugerirNombre } from "../format";
import type { OpcionesProducto, ProductoDetalleDTO } from "../queries";
import { productoSchema, type ProductoInput, type ProductoOutput } from "../schemas";
import { PRESENTACION_VACIA, PresentacionesFields } from "./presentaciones-fields";

const OPCIONES_FUNCIONAMIENTO = FUNCIONAMIENTOS.map((f) => ({ value: f, label: FUNCIONAMIENTO_LABELS[f] }));
const OPCIONES_ENCHUFE = TIPOS_ENCHUFE.map((t) => ({ value: t, label: TIPO_ENCHUFE_LABELS[t] }));

function valoresIniciales(p?: ProductoDetalleDTO): ProductoInput {
  if (!p) {
    return {
      tipo: "BALANZA",
      nombre: "",
      modelo: "",
      marcaId: "",
      descripcion: "",
      observaciones: "",
      usoId: "",
      formaId: "",
      funcionamiento: "",
      capacidadKg: "",
      precisionG: "",
      voltaje: "",
      tipoEnchufe: "",
      presentaciones: [PRESENTACION_VACIA],
    };
  }
  const num = (v: string | null) => (v === null ? "" : String(Number(v)));
  return {
    id: p.id,
    tipo: p.tipo,
    nombre: p.nombre,
    modelo: p.modelo ?? "",
    marcaId: p.marcaId ? String(p.marcaId) : "",
    descripcion: p.descripcion ?? "",
    observaciones: p.observaciones ?? "",
    usoId: p.usoId ? String(p.usoId) : "",
    formaId: p.formaId ? String(p.formaId) : "",
    funcionamiento: p.funcionamiento ?? "",
    capacidadKg: num(p.capacidadKg),
    precisionG: num(p.precisionG),
    voltaje: num(p.voltaje),
    tipoEnchufe: p.tipoEnchufe ?? "",
    presentaciones: p.presentaciones.map((pr) => ({
      id: pr.id,
      nombre: pr.nombre,
      codigo: pr.codigo,
      codigoBarras: pr.codigoBarras ?? "",
      precioVenta: pr.precioVenta,
      precioMinimo: pr.precioMinimo,
      stockMinimo: String(pr.stockMinimo),
      unidadesPorCaja: pr.unidadesPorCaja ? String(pr.unidadesPorCaja) : "",
      activo: pr.activo,
      stockInicial: "",
      costoInicial: "",
    })),
  };
}

type Props = {
  producto?: ProductoDetalleDTO;
  opciones: OpcionesProducto;
  puedeStockInicial: boolean;
};

export function ProductoForm({ producto, opciones, puedeStockInicial }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const editando = !!producto;
  const form = useForm<ProductoInput, unknown, ProductoOutput>({
    resolver: zodResolver(productoSchema),
    defaultValues: valoresIniciales(producto),
  });
  const { errors } = form.formState;
  const tipo = useWatch({ control: form.control, name: "tipo" });
  const campos = CAMPOS_POR_TIPO[tipo];

  const existentes = Object.fromEntries((producto?.presentaciones ?? []).map((p) => [p.id, { stock: p.stock }]));

  const etiqueta = (lista: { value: string; label: string }[], valor: string) =>
    lista.find((o) => o.value === valor)?.label ?? null;

  const autocompletarNombre = () => {
    const v = form.getValues();
    form.setValue(
      "nombre",
      sugerirNombre({
        tipo: v.tipo,
        marca: campos.marca !== "no" ? etiqueta(opciones.marcas, v.marcaId) : null,
        modelo: v.modelo || null,
        forma: campos.balanza ? etiqueta(opciones.formas, v.formaId) : null,
        capacidadKg: campos.capacidad ? v.capacidadKg || null : null,
        voltaje: campos.voltaje ? v.voltaje || null : null,
        tipoEnchufe: campos.enchufe ? ((v.tipoEnchufe || null) as TipoEnchufe | null) : null,
        funcionamiento: (v.funcionamiento || null) as Funcionamiento | null,
      }),
      { shouldValidate: true, shouldDirty: true },
    );
  };

  // Se envían los valores crudos; el servidor vuelve a validar y transformar.
  const onSubmit = form.handleSubmit(() => {
    const values = form.getValues();
    startTransition(async () => {
      const result = await guardarProductoAction(values);
      if (handleActionResult(result, form.setError)) {
        router.push(`/productos/${result.data.id}`);
        router.refresh();
      }
    });
  });

  return (
    <form onSubmit={onSubmit} noValidate className="grid max-w-5xl gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Tipo de producto</CardTitle>
          <CardDescription>
            {editando ? "El tipo no se puede cambiar después de registrar el producto." : "Define qué datos se piden."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {editando ? (
            <Badge variant="secondary" className="h-7 px-3 text-sm">
              {TIPO_PRODUCTO_LABELS[tipo]}
            </Badge>
          ) : (
            <Controller
              control={form.control}
              name="tipo"
              render={({ field }) => (
                <div role="radiogroup" aria-label="Tipo de producto" className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">
                  {TIPOS_PRODUCTO.map((t) => (
                    <button
                      key={t}
                      type="button"
                      role="radio"
                      aria-checked={field.value === t}
                      onClick={() => field.onChange(t)}
                      className={cn(
                        "rounded-lg border px-3 py-2 text-sm font-medium transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
                        field.value === t
                          ? "border-primary bg-primary/10 text-primary"
                          : "hover:bg-muted",
                      )}
                    >
                      {TIPO_PRODUCTO_LABELS[t]}
                    </button>
                  ))}
                </div>
              )}
            />
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Datos del producto</CardTitle>
        </CardHeader>
        <CardContent>
          <FieldGroup>
            <div className="grid gap-5 md:grid-cols-2">
              {campos.marca !== "no" && (
                <FormField
                  label={campos.marca === "requerida" ? "Marca" : "Marca (opcional)"}
                  htmlFor="marcaId"
                  error={errors.marcaId}
                >
                  <Controller
                    control={form.control}
                    name="marcaId"
                    render={({ field }) => (
                      <SelectField
                        id="marcaId"
                        value={field.value}
                        onChange={field.onChange}
                        opciones={opciones.marcas}
                        placeholder="Selecciona la marca"
                        opcionVacia={campos.marca === "opcional" ? "Sin marca" : undefined}
                        invalid={!!errors.marcaId}
                      />
                    )}
                  />
                </FormField>
              )}
              <FormField label="Modelo (opcional)" htmlFor="modelo" error={errors.modelo}>
                <Input id="modelo" placeholder="Ej. KD-V" aria-invalid={!!errors.modelo} {...form.register("modelo")} />
              </FormField>
            </div>

            {campos.balanza && (
              <div className="grid gap-5 md:grid-cols-3">
                <FormField label="Tipo de uso" htmlFor="usoId" error={errors.usoId}>
                  <Controller
                    control={form.control}
                    name="usoId"
                    render={({ field }) => (
                      <SelectField
                        id="usoId"
                        value={field.value}
                        onChange={field.onChange}
                        opciones={opciones.usos}
                        placeholder="Comercial, precisión…"
                        invalid={!!errors.usoId}
                      />
                    )}
                  />
                </FormField>
                <FormField label="Forma" htmlFor="formaId" error={errors.formaId}>
                  <Controller
                    control={form.control}
                    name="formaId"
                    render={({ field }) => (
                      <SelectField
                        id="formaId"
                        value={field.value}
                        onChange={field.onChange}
                        opciones={opciones.formas}
                        placeholder="Mostrador, plataforma…"
                        invalid={!!errors.formaId}
                      />
                    )}
                  />
                </FormField>
                <FormField label="Funcionamiento" htmlFor="funcionamiento" error={errors.funcionamiento}>
                  <Controller
                    control={form.control}
                    name="funcionamiento"
                    render={({ field }) => (
                      <SelectField
                        id="funcionamiento"
                        value={field.value}
                        onChange={field.onChange}
                        opciones={OPCIONES_FUNCIONAMIENTO}
                        placeholder="Digital o mecánica"
                        invalid={!!errors.funcionamiento}
                      />
                    )}
                  />
                </FormField>
              </div>
            )}

            {(campos.capacidad || campos.balanza || campos.voltaje || campos.enchufe) && (
              <div className="grid gap-5 md:grid-cols-3">
                {campos.capacidad && (
                  <FormField
                    label={tipo === "SENSOR" ? "Para balanzas de" : "Capacidad"}
                    htmlFor="capacidadKg"
                    error={errors.capacidadKg}
                  >
                    <UnitInput
                      id="capacidadKg"
                      unidad="kg"
                      placeholder="40"
                      aria-invalid={!!errors.capacidadKg}
                      {...form.register("capacidadKg")}
                    />
                  </FormField>
                )}
                {campos.balanza && (
                  <FormField label="Precisión (opcional)" htmlFor="precisionG" error={errors.precisionG}>
                    <UnitInput
                      id="precisionG"
                      unidad="g"
                      placeholder="5"
                      aria-invalid={!!errors.precisionG}
                      {...form.register("precisionG")}
                    />
                  </FormField>
                )}
                {campos.voltaje && (
                  <FormField label="Voltaje" htmlFor="voltaje" error={errors.voltaje}>
                    <UnitInput
                      id="voltaje"
                      unidad="V"
                      placeholder="4"
                      aria-invalid={!!errors.voltaje}
                      {...form.register("voltaje")}
                    />
                  </FormField>
                )}
                {campos.enchufe && (
                  <FormField label="Tipo de entrada" htmlFor="tipoEnchufe" error={errors.tipoEnchufe}>
                    <Controller
                      control={form.control}
                      name="tipoEnchufe"
                      render={({ field }) => (
                        <SelectField
                          id="tipoEnchufe"
                          value={field.value}
                          onChange={field.onChange}
                          opciones={OPCIONES_ENCHUFE}
                          placeholder="De punta o triangular"
                          invalid={!!errors.tipoEnchufe}
                        />
                      )}
                    />
                  </FormField>
                )}
              </div>
            )}

            <Field data-invalid={!!errors.nombre}>
              <FieldLabel htmlFor="nombre">Nombre del producto</FieldLabel>
              <InputGroup>
                <InputGroupInput
                  id="nombre"
                  placeholder="Ej. Balanza Kambor 40 kg mostrador"
                  aria-invalid={!!errors.nombre}
                  {...form.register("nombre")}
                />
                <InputGroupAddon align="inline-end">
                  <InputGroupButton onClick={autocompletarNombre}>
                    <WandSparklesIcon />
                    Sugerir
                  </InputGroupButton>
                </InputGroupAddon>
              </InputGroup>
              <FieldError errors={[errors.nombre]} />
            </Field>

            <div className="grid gap-5 md:grid-cols-2">
              <FormField label="Descripción (opcional)" htmlFor="descripcion" error={errors.descripcion}>
                <Textarea id="descripcion" rows={3} {...form.register("descripcion")} />
              </FormField>
              <FormField label="Observaciones (opcional)" htmlFor="observaciones" error={errors.observaciones}>
                <Textarea id="observaciones" rows={3} {...form.register("observaciones")} />
              </FormField>
            </div>
          </FieldGroup>
        </CardContent>
      </Card>

      <PresentacionesFields form={form} tipo={tipo} puedeStockInicial={puedeStockInicial} existentes={existentes} />

      <div className="sticky bottom-0 -mx-4 flex justify-end gap-2 border-t bg-background/95 px-4 py-3 backdrop-blur md:-mx-6 md:px-6">
        <Button
          variant="outline"
          nativeButton={false}
          render={<Link href={producto ? `/productos/${producto.id}` : "/productos"} />}
        >
          Cancelar
        </Button>
        <Button type="submit" disabled={pending}>
          {pending && <Spinner />}
          {editando ? "Guardar cambios" : "Registrar producto"}
        </Button>
      </div>
    </form>
  );
}
