"use client";

import { useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Controller, useFieldArray, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { PackageOpenIcon, Trash2Icon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldContent, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { FormField } from "@/components/form/form-field";
import { MoneyInput } from "@/components/form/money-input";
import { PresentacionPicker } from "@/components/form/presentacion-picker";
import { SelectField, type Opcion } from "@/components/form/select-field";
import { fechaInput, hoyLima } from "@/lib/dates";
import { formatPEN } from "@/lib/money";
import { handleActionResult } from "@/lib/notify";
import { cn } from "@/lib/utils";
import { guardarCompraAction } from "../actions";
import { EMPAQUE_LABELS, TIPOS_EMPAQUE, UNIDADES_EMPAQUE, type TipoEmpaque } from "../constants";
import type { CompraDetalleDTO, PresentacionCompraOpcion } from "../queries";
import { compraSchema, type CompraInput, type CompraOutput, type DetalleCompraInput } from "../schemas";

/** Columnas por producto cuando la tarjeta es ancha (una fila por producto). */
const COLUMNAS_COMPRA =
  "@5xl:grid-cols-[minmax(0,1fr)_7.5rem_5rem_5rem_8rem_4.5rem_6rem_6.5rem_2rem] @5xl:items-start";

const OPCIONES_EMPAQUE =TIPOS_EMPAQUE.map((e) => ({
  value: e,
  label: EMPAQUE_LABELS[e].singular[0]!.toUpperCase() + EMPAQUE_LABELS[e].singular.slice(1),
}));

function valoresIniciales(compra?: CompraDetalleDTO): CompraInput {
  if (!compra) {
    return {
      proveedorId: "",
      fechaPedido: hoyLima(),
      documentoProveedor: "",
      observaciones: "",
      recibirAhora: false,
      detalles: [],
    };
  }
  return {
    id: compra.id,
    proveedorId: String(compra.proveedorId),
    fechaPedido: fechaInput(compra.fechaPedido),
    documentoProveedor: compra.documentoProveedor ?? "",
    observaciones: compra.observaciones ?? "",
    recibirAhora: false,
    detalles: compra.detalles.map((d) => ({
      presentacionId: d.presentacionId,
      empaque: d.empaque,
      unidadesPorEmpaque: String(d.unidadesPorEmpaque),
      cantidadEmpaques: String(d.cantidadEmpaques),
      costoEmpaque: d.costoEmpaque,
    })),
  };
}

/** Cálculo solo para mostrar; el servidor recalcula todo. */
function calcularLinea(d: DetalleCompraInput) {
  const unidades = Number(d.unidadesPorEmpaque) || 0;
  const cantidad = Number(d.cantidadEmpaques) || 0;
  const costo = Number(d.costoEmpaque) || 0;
  return {
    unidadesTotales: unidades * cantidad,
    costoUnitario: unidades > 0 ? costo / unidades : 0,
    subtotal: Math.round(costo * cantidad * 100) / 100,
  };
}

type Props = {
  compra?: CompraDetalleDTO;
  proveedores: Opcion[];
  presentaciones: PresentacionCompraOpcion[];
  puedeRecibir: boolean;
};

export function CompraForm({ compra, proveedores, presentaciones, puedeRecibir }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const form = useForm<CompraInput, unknown, CompraOutput>({
    resolver: zodResolver(compraSchema),
    defaultValues: valoresIniciales(compra),
  });
  const { errors } = form.formState;
  const { fields, append, remove } = useFieldArray({ control: form.control, name: "detalles", keyName: "key" });
  const detalles = useWatch({ control: form.control, name: "detalles" });
  const recibirAhora = useWatch({ control: form.control, name: "recibirAhora" });

  // Nombre de cada presentación (las del pedido original aunque ya no estén activas)
  const nombres = new Map<number, { label: string; unidadesPorCaja: number | null }>(
    presentaciones.map((p) => [p.id, { label: p.label, unidadesPorCaja: p.unidadesPorCaja }]),
  );
  for (const d of compra?.detalles ?? []) {
    if (!nombres.has(d.presentacionId)) {
      nombres.set(d.presentacionId, { label: `${d.producto} — ${d.presentacion} (${d.codigo})`, unidadesPorCaja: null });
    }
  }

  const total = detalles.reduce((s, d) => s + calcularLinea(d).subtotal, 0);
  const errorDetalles = errors.detalles?.message ?? errors.detalles?.root?.message;

  const agregar = (p: PresentacionCompraOpcion) => {
    const enCaja = !!p.unidadesPorCaja;
    const unidades = enCaja ? p.unidadesPorCaja! : 1;
    append({
      presentacionId: p.id,
      empaque: enCaja ? "CAJA" : "UNIDAD",
      unidadesPorEmpaque: String(unidades),
      cantidadEmpaques: "1",
      costoEmpaque: p.ultimoCosto ? (Number(p.ultimoCosto) * unidades).toFixed(2) : "",
    });
  };

  const cambiarEmpaque = (i: number, empaque: TipoEmpaque) => {
    const fijo = UNIDADES_EMPAQUE[empaque];
    const caja = nombres.get(form.getValues(`detalles.${i}.presentacionId`))?.unidadesPorCaja;
    form.setValue(`detalles.${i}.empaque`, empaque, { shouldDirty: true });
    form.setValue(`detalles.${i}.unidadesPorEmpaque`, String(fijo ?? caja ?? form.getValues(`detalles.${i}.unidadesPorEmpaque`)), {
      shouldValidate: true,
      shouldDirty: true,
    });
  };

  // Se envían los valores crudos; el servidor vuelve a validar y calcular.
  const onSubmit = form.handleSubmit(() => {
    const values = form.getValues();
    startTransition(async () => {
      const result = await guardarCompraAction(values);
      if (handleActionResult(result, form.setError)) {
        router.push(`/compras/${result.data.id}`);
        router.refresh();
      }
    });
  });

  return (
    <form onSubmit={onSubmit} noValidate className="grid max-w-6xl gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Datos del pedido</CardTitle>
        </CardHeader>
        <CardContent>
          <FieldGroup>
            <div className="grid gap-5 md:grid-cols-3">
              <FormField label="Proveedor" htmlFor="proveedorId" error={errors.proveedorId}>
                <Controller
                  control={form.control}
                  name="proveedorId"
                  render={({ field }) => (
                    <SelectField
                      id="proveedorId"
                      value={field.value}
                      onChange={field.onChange}
                      opciones={proveedores}
                      placeholder={proveedores.length ? "Selecciona el proveedor" : "Primero registra un proveedor"}
                      invalid={!!errors.proveedorId}
                    />
                  )}
                />
              </FormField>
              <FormField label="Fecha del pedido" htmlFor="fechaPedido" error={errors.fechaPedido}>
                <Input
                  id="fechaPedido"
                  type="date"
                  max={hoyLima()}
                  aria-invalid={!!errors.fechaPedido}
                  {...form.register("fechaPedido")}
                />
              </FormField>
              <FormField
                label="N° factura / guía (opcional)"
                htmlFor="documentoProveedor"
                error={errors.documentoProveedor}
              >
                <Input id="documentoProveedor" placeholder="Ej. F001-1234" {...form.register("documentoProveedor")} />
              </FormField>
            </div>
            <FormField label="Observaciones (opcional)" htmlFor="observaciones" error={errors.observaciones}>
              <Textarea id="observaciones" rows={2} {...form.register("observaciones")} />
            </FormField>
          </FieldGroup>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Productos</CardTitle>
          <CardDescription>
            Compra por unidad, caja, decena, docena o ciento. El stock y el costo se guardan siempre por unidad.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <PresentacionPicker
            items={presentaciones.map((p) => ({ ...p, detalle: `Stock: ${p.stock}${p.unidadesPorCaja ? ` · Caja de ${p.unidadesPorCaja}` : ""}` }))}
            onSelect={agregar}
            excluidos={detalles.map((d) => d.presentacionId)}
          />
          {errorDetalles && <p className="text-sm text-destructive">{errorDetalles}</p>}

          {fields.length > 0 && (
            // Angosto (celular): cada producto es una tarjeta con los campos uno debajo de otro.
            // Ancho: una fila por producto. Depende del ancho de la tarjeta (@container), no de la pantalla.
            <div className="@container rounded-lg border">
              <div className={cn("hidden border-b px-3 py-2 text-xs font-medium text-muted-foreground @5xl:grid", COLUMNAS_COMPRA)}>
                <span>Producto</span>
                <span>Empaque</span>
                <span>Und./emp.</span>
                <span>Cantidad</span>
                <span>Costo x empaque</span>
                <span className="text-right">Unidades</span>
                <span className="text-right">Costo unit.</span>
                <span className="text-right">Subtotal</span>
              </div>
              <div className="divide-y">
                {fields.map((field, i) => {
                  const d = detalles[i];
                  const e = errors.detalles?.[i];
                  const calc = d ? calcularLinea(d) : null;
                  const etiqueta = "mb-1 block text-xs text-muted-foreground @5xl:sr-only";
                  return (
                    <div key={field.key} className={cn("grid gap-3 p-3", COLUMNAS_COMPRA)}>
                      {/* Nombre y quitar (en ancho, "quitar" va a la última columna) */}
                      <div className="flex items-start gap-2 @5xl:contents">
                        <div className="min-w-0 flex-1">
                          <div className="text-sm font-medium">{nombres.get(field.presentacionId)?.label ?? "—"}</div>
                          {e?.presentacionId && <p className="text-xs text-destructive">{e.presentacionId.message}</p>}
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          aria-label="Quitar"
                          className="@5xl:col-start-9 @5xl:row-start-1"
                          onClick={() => remove(i)}
                        >
                          <Trash2Icon />
                        </Button>
                      </div>

                      <div className="grid grid-cols-2 gap-3 @lg:grid-cols-4 @5xl:contents">
                        <div className="min-w-0">
                          <span className={etiqueta}>Empaque</span>
                          <SelectField
                            value={d?.empaque ?? "UNIDAD"}
                            onChange={(v) => cambiarEmpaque(i, v as TipoEmpaque)}
                            opciones={OPCIONES_EMPAQUE}
                          />
                        </div>
                        <div className="min-w-0">
                          <span className={etiqueta}>Und./emp.</span>
                          <Input
                            inputMode="numeric"
                            aria-label="Unidades por empaque"
                            disabled={d?.empaque !== "CAJA"}
                            aria-invalid={!!e?.unidadesPorEmpaque}
                            {...form.register(`detalles.${i}.unidadesPorEmpaque`)}
                          />
                          {e?.unidadesPorEmpaque && <p className="text-xs text-destructive">{e.unidadesPorEmpaque.message}</p>}
                        </div>
                        <div className="min-w-0">
                          <span className={etiqueta}>Cantidad</span>
                          <Input
                            inputMode="numeric"
                            aria-label="Cantidad de empaques"
                            aria-invalid={!!e?.cantidadEmpaques}
                            {...form.register(`detalles.${i}.cantidadEmpaques`)}
                          />
                          {e?.cantidadEmpaques && <p className="text-xs text-destructive">{e.cantidadEmpaques.message}</p>}
                        </div>
                        <div className="min-w-0">
                          <span className={etiqueta}>Costo x empaque</span>
                          <MoneyInput
                            aria-label="Costo por empaque"
                            aria-invalid={!!e?.costoEmpaque}
                            {...form.register(`detalles.${i}.costoEmpaque`)}
                          />
                          {e?.costoEmpaque && <p className="text-xs text-destructive">{e.costoEmpaque.message}</p>}
                        </div>
                      </div>

                      {/* Cálculos: en angosto, tres datos en fila; en ancho, sus columnas */}
                      <div className="grid grid-cols-3 gap-2 rounded-md bg-muted/40 px-2 py-1.5 text-sm @5xl:contents">
                        <div className="@5xl:pt-1.5 @5xl:text-right">
                          <span className="block text-xs text-muted-foreground @5xl:sr-only">Unidades</span>
                          <span className="tabular-nums">{calc?.unidadesTotales ?? 0}</span>
                        </div>
                        <div className="@5xl:pt-1.5 @5xl:text-right">
                          <span className="block text-xs text-muted-foreground @5xl:sr-only">Costo unit.</span>
                          <span className="tabular-nums">{calc ? formatPEN(calc.costoUnitario) : "—"}</span>
                        </div>
                        <div className="text-right @5xl:pt-1.5">
                          <span className="block text-xs text-muted-foreground @5xl:sr-only">Subtotal</span>
                          <span className="font-medium tabular-nums">{calc ? formatPEN(calc.subtotal) : "—"}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="flex items-baseline justify-end gap-3 border-t px-3 py-2">
                <span className="font-medium">Total</span>
                <span className="text-base font-semibold tabular-nums">{formatPEN(total)}</span>
              </div>
            </div>
          )}
          {fields.length === 0 && (
            <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed py-10 text-center text-sm text-muted-foreground">
              <PackageOpenIcon className="size-8" />
              Busca y agrega los productos del pedido.
            </div>
          )}
        </CardContent>
      </Card>

      {puedeRecibir && (
        <Controller
          control={form.control}
          name="recibirAhora"
          render={({ field }) => (
            <Field orientation="horizontal" className="rounded-xl border bg-card p-4">
              <FieldContent>
                <FieldLabel htmlFor="recibirAhora">La mercadería ya llegó (recibir ahora)</FieldLabel>
                <FieldDescription>
                  Registra el pedido como recibido completo: el stock sube de inmediato. Si llegó incompleto, déjalo
                  desmarcado y usa &quot;Recibir&quot; desde el pedido.
                </FieldDescription>
              </FieldContent>
              <Switch id="recibirAhora" checked={field.value} onCheckedChange={field.onChange} />
            </Field>
          )}
        />
      )}

      <div className="sticky bottom-0 -mx-4 flex items-center justify-end gap-3 border-t bg-background/95 px-4 py-3 backdrop-blur md:-mx-6 md:px-6">
        <span className="mr-auto text-sm text-muted-foreground">
          Total: <span className="font-semibold text-foreground tabular-nums">{formatPEN(total)}</span>
        </span>
        <Button variant="outline" nativeButton={false} render={<Link href={compra ? `/compras/${compra.id}` : "/compras"} />}>
          Cancelar
        </Button>
        <Button type="submit" disabled={pending}>
          {pending && <Spinner />}
          {recibirAhora ? "Guardar y recibir" : compra ? "Guardar cambios" : "Registrar pedido"}
        </Button>
      </div>
    </form>
  );
}
