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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
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
            <div className="rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-56">Producto</TableHead>
                    <TableHead className="text-right">Stock actual</TableHead>
                    {info.modo === "libre" && <TableHead className="w-36">Tipo</TableHead>}
                    <TableHead className="w-28">{etiquetaCantidad}</TableHead>
                    {mostrarCosto && <TableHead className="w-36">Costo unit.</TableHead>}
                    <TableHead className="text-right">Diferencia</TableHead>
                    <TableHead className="text-right">Queda</TableHead>
                    <TableHead className="w-10" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {fields.map((field, i) => {
                    const p = porId.get(field.presentacionId);
                    const linea = lineas[i];
                    const stock = p?.stock ?? 0;
                    const dif = linea ? diferencia(motivo, linea, stock) : null;
                    const queda = dif === null ? null : stock + dif;
                    const e = errors.lineas?.[i];
                    const esEntrada = info.modo === "entrada" || (info.modo === "libre" && linea?.direccion === "ENTRADA");
                    return (
                      <TableRow key={field.key} className="align-top">
                        <TableCell className="text-sm font-medium whitespace-normal">{p?.label ?? "—"}</TableCell>
                        <TableCell className="pt-4 text-right tabular-nums">{stock}</TableCell>
                        {info.modo === "libre" && (
                          <TableCell>
                            <Controller
                              control={form.control}
                              name={`lineas.${i}.direccion`}
                              render={({ field: f }) => (
                                <SelectField value={f.value} onChange={f.onChange} opciones={OPCIONES_DIRECCION} />
                              )}
                            />
                          </TableCell>
                        )}
                        <TableCell>
                          <Input
                            inputMode="numeric"
                            aria-label={etiquetaCantidad}
                            aria-invalid={!!e?.cantidad}
                            {...form.register(`lineas.${i}.cantidad`)}
                          />
                          {e?.cantidad && <p className="text-xs text-destructive">{e.cantidad.message}</p>}
                        </TableCell>
                        {mostrarCosto && (
                          <TableCell>
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
                              <span className="block pt-2 text-xs text-muted-foreground">—</span>
                            )}
                          </TableCell>
                        )}
                        <TableCell
                          className={cn(
                            "pt-4 text-right font-medium tabular-nums",
                            dif !== null && dif > 0 && "text-emerald-600 dark:text-emerald-400",
                            dif !== null && dif < 0 && "text-destructive",
                          )}
                        >
                          {dif === null ? "—" : dif > 0 ? `+${dif}` : dif}
                        </TableCell>
                        <TableCell className={cn("pt-4 text-right tabular-nums", queda !== null && queda < 0 && "font-medium text-destructive")}>
                          {queda ?? "—"}
                        </TableCell>
                        <TableCell>
                          <Button type="button" variant="ghost" size="icon-sm" aria-label="Quitar" onClick={() => remove(i)}>
                            <Trash2Icon />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
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
