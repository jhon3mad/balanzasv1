"use client";

import { useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Controller, useFieldArray, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ClipboardListIcon, Trash2Icon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FieldGroup } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { FormField } from "@/components/form/form-field";
import { MoneyInput } from "@/components/form/money-input";
import { PresentacionPicker } from "@/components/form/presentacion-picker";
import { SelectField } from "@/components/form/select-field";
import { handleActionResult } from "@/lib/notify";
import { cn } from "@/lib/utils";
import { registrarAjusteAction } from "../actions";
import { MOTIVO_AJUSTE_INFO, MOTIVOS_AJUSTE, type MotivoAjuste } from "../constants";
import type { PresentacionAjusteOpcion } from "../queries";
import { ajusteSchema, type AjusteInput, type AjusteOutput, type LineaAjusteInput } from "../schemas";

const OPCIONES_MOTIVO = MOTIVOS_AJUSTE.map((m) => ({ value: m, label: MOTIVO_AJUSTE_INFO[m].label }));
const OPCIONES_DIRECCION = [
  { value: "ENTRADA", label: "Entrada (+)" },
  { value: "SALIDA", label: "Salida (−)" },
];

/**
 * Columnas por producto cuando la tarjeta es ancha, según el motivo. Clases completas y fijas
 * (Tailwind no detecta clases armadas en tiempo de ejecución).
 * producto · stock · [tipo] · cantidad · [costo] · diferencia · queda · quitar
 */
const COLUMNAS_AJUSTE = {
  simple: { grid: "@4xl:grid-cols-[minmax(0,1fr)_6rem_7rem_6rem_5rem_2rem] @4xl:items-start", quitar: "@4xl:col-start-6 @4xl:row-start-1" },
  conCosto: {
    grid: "@4xl:grid-cols-[minmax(0,1fr)_6rem_7rem_8rem_6rem_5rem_2rem] @4xl:items-start",
    quitar: "@4xl:col-start-7 @4xl:row-start-1",
  },
  libre: {
    grid: "@4xl:grid-cols-[minmax(0,1fr)_6rem_8.5rem_7rem_8rem_6rem_5rem_2rem] @4xl:items-start",
    quitar: "@4xl:col-start-8 @4xl:row-start-1",
  },
};

/** Diferencia que producirá la línea (solo para mostrar). */
function diferencia(motivo: MotivoAjuste, linea: LineaAjusteInput, stock: number): number | null {
  if (linea.cantidad.trim() === "" || !/^\d+$/.test(linea.cantidad)) return null;
  const n = Number(linea.cantidad);
  const modo = MOTIVO_AJUSTE_INFO[motivo].modo;
  if (modo === "conteo") return n - stock;
  if (modo === "entrada" || (modo === "libre" && linea.direccion === "ENTRADA")) return n;
  return -n;
}

export function AjusteForm({ presentaciones }: { presentaciones: PresentacionAjusteOpcion[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const form = useForm<AjusteInput, unknown, AjusteOutput>({
    resolver: zodResolver(ajusteSchema),
    defaultValues: { motivo: "CONTEO", observacion: "", lineas: [] },
  });
  const { errors } = form.formState;
  const { fields, append, remove } = useFieldArray({ control: form.control, name: "lineas", keyName: "key" });
  const motivo = useWatch({ control: form.control, name: "motivo" });
  const lineas = useWatch({ control: form.control, name: "lineas" });
  const info = MOTIVO_AJUSTE_INFO[motivo];
  const porId = new Map(presentaciones.map((p) => [p.id, p]));
  const errorLineas = errors.lineas?.message ?? errors.lineas?.root?.message;

  const onSubmit = form.handleSubmit(() => {
    const values = form.getValues();
    startTransition(async () => {
      const result = await registrarAjusteAction(values);
      if (handleActionResult(result, form.setError)) {
        router.push(`/inventario/ajustes/${result.data.id}`);
        router.refresh();
      }
    });
  });

  const etiquetaCantidad = info.modo === "conteo" ? "Contado" : info.modo === "salida" ? "Sale" : info.modo === "entrada" ? "Entra" : "Cantidad";
  const mostrarCosto = info.modo === "entrada" || info.modo === "libre";
  const columnas = COLUMNAS_AJUSTE[info.modo === "libre" ? "libre" : mostrarCosto ? "conCosto" : "simple"];

  return (
    <form onSubmit={onSubmit} noValidate className="grid max-w-5xl gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Motivo del ajuste</CardTitle>
          <CardDescription>{info.ayuda}</CardDescription>
        </CardHeader>
        <CardContent>
          <FieldGroup>
            <div className="grid gap-5 md:grid-cols-[18rem_1fr]">
              <FormField label="Motivo" htmlFor="motivo" error={errors.motivo}>
                <Controller
                  control={form.control}
                  name="motivo"
                  render={({ field }) => (
                    <SelectField id="motivo" value={field.value} onChange={field.onChange} opciones={OPCIONES_MOTIVO} />
                  )}
                />
              </FormField>
              <FormField
                label={motivo === "OTRO" ? "Observación" : "Observación (opcional)"}
                htmlFor="observacion"
                error={errors.observacion}
              >
                <Textarea id="observacion" rows={2} aria-invalid={!!errors.observacion} {...form.register("observacion")} />
              </FormField>
            </div>
          </FieldGroup>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Productos</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4">
          <PresentacionPicker
            items={presentaciones.map((p) => ({ ...p, detalle: `Stock actual: ${p.stock}` }))}
            excluidos={lineas.map((l) => l.presentacionId)}
            onSelect={(p) =>
              append({ presentacionId: p.id, direccion: "SALIDA", cantidad: info.modo === "conteo" ? String(p.stock) : "", costoUnitario: "" })
            }
          />
          {errorLineas && <p className="text-sm text-destructive">{errorLineas}</p>}

          {fields.length > 0 ? (
            // Angosto (celular): cada producto es una tarjeta con los campos uno debajo de otro.
            // Ancho: una fila por producto. Depende del ancho de la tarjeta (@container), no de la pantalla.
            <div className="@container rounded-lg border">
              <div className={cn("hidden border-b px-3 py-2 text-xs font-medium text-muted-foreground @4xl:grid", columnas.grid)}>
                <span>Producto</span>
                <span className="text-right">Stock actual</span>
                {info.modo === "libre" && <span>Tipo</span>}
                <span>{etiquetaCantidad}</span>
                {mostrarCosto && <span>Costo unit.</span>}
                <span className="text-right">Diferencia</span>
                <span className="text-right">Queda</span>
              </div>
              <div className="divide-y">
                {fields.map((field, i) => {
                  const p = porId.get(field.presentacionId);
                  const linea = lineas[i];
                  const stock = p?.stock ?? 0;
                  const dif = linea ? diferencia(motivo, linea, stock) : null;
                  const queda = dif === null ? null : stock + dif;
                  const e = errors.lineas?.[i];
                  const esEntrada = info.modo === "entrada" || (info.modo === "libre" && linea?.direccion === "ENTRADA");
                  const etiqueta = "mb-1 block text-xs text-muted-foreground @4xl:sr-only";
                  return (
                    <div key={field.key} className={cn("grid gap-3 p-3", columnas.grid)}>
                      {/* Nombre, stock y quitar (en ancho, "quitar" va a la última columna) */}
                      <div className="flex items-start gap-2 @4xl:contents">
                        <div className="min-w-0 flex-1">
                          <div className="text-sm font-medium">{p?.label ?? "—"}</div>
                          <div className="text-xs text-muted-foreground @4xl:hidden">Stock actual: {stock}</div>
                        </div>
                        <div className="hidden pt-1.5 text-right tabular-nums @4xl:block">{stock}</div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          aria-label="Quitar"
                          className={columnas.quitar}
                          onClick={() => remove(i)}
                        >
                          <Trash2Icon />
                        </Button>
                      </div>

                      <div className="grid grid-cols-2 gap-3 @4xl:contents">
                        {info.modo === "libre" && (
                          <div className="min-w-0">
                            <span className={etiqueta}>Tipo</span>
                            <Controller
                              control={form.control}
                              name={`lineas.${i}.direccion`}
                              render={({ field: f }) => (
                                <SelectField value={f.value} onChange={f.onChange} opciones={OPCIONES_DIRECCION} />
                              )}
                            />
                          </div>
                        )}
                        <div className="min-w-0">
                          <span className={etiqueta}>{etiquetaCantidad}</span>
                          <Input
                            inputMode="numeric"
                            aria-label={etiquetaCantidad}
                            aria-invalid={!!e?.cantidad}
                            {...form.register(`lineas.${i}.cantidad`)}
                          />
                          {e?.cantidad && <p className="text-xs text-destructive">{e.cantidad.message}</p>}
                        </div>
                        {mostrarCosto && (
                          <div className="min-w-0">
                            <span className={etiqueta}>Costo unit.</span>
                            {esEntrada ? (
                              <>
                                <MoneyInput
                                  aria-label="Costo unitario"
                                  placeholder={info.modo === "entrada" ? "0.00" : p?.costoPromedio}
                                  aria-invalid={!!e?.costoUnitario}
                                  {...form.register(`lineas.${i}.costoUnitario`)}
                                />
                                {e?.costoUnitario && <p className="text-xs text-destructive">{e.costoUnitario.message}</p>}
                              </>
                            ) : (
                              <span className="block pt-2 text-xs text-muted-foreground">— (solo en entradas)</span>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Resultado: en angosto, en fila; en ancho, sus columnas */}
                      <div className="grid grid-cols-2 gap-2 rounded-md bg-muted/40 px-2 py-1.5 text-sm @4xl:contents">
                        <div className="@4xl:pt-1.5 @4xl:text-right">
                          <span className="block text-xs text-muted-foreground @4xl:sr-only">Diferencia</span>
                          <span
                            className={cn(
                              "font-medium tabular-nums",
                              dif !== null && dif > 0 && "text-emerald-600 dark:text-emerald-400",
                              dif !== null && dif < 0 && "text-destructive",
                            )}
                          >
                            {dif === null ? "—" : dif > 0 ? `+${dif}` : dif}
                          </span>
                        </div>
                        <div className="text-right @4xl:pt-1.5">
                          <span className="block text-xs text-muted-foreground @4xl:sr-only">Queda</span>
                          <span className={cn("tabular-nums", queda !== null && queda < 0 && "font-medium text-destructive")}>
                            {queda ?? "—"}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed py-10 text-center text-sm text-muted-foreground">
              <ClipboardListIcon className="size-8" />
              Busca y agrega los productos a ajustar.
            </div>
          )}
          {info.modo === "libre" && (
            <p className="text-xs text-muted-foreground">
              En entradas, si no indicas costo se usa el costo promedio actual (no cambia).
            </p>
          )}
        </CardContent>
      </Card>

      <div className="sticky bottom-0 -mx-4 flex justify-end gap-2 border-t bg-background/95 px-4 py-3 backdrop-blur md:-mx-6 md:px-6">
        <Button variant="outline" nativeButton={false} render={<Link href="/inventario/ajustes" />}>
          Cancelar
        </Button>
        <Button type="submit" disabled={pending}>
          {pending && <Spinner />}
          Registrar ajuste
        </Button>
      </div>
    </form>
  );
}
