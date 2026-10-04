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
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { FormField } from "@/components/form/form-field";
import { MoneyInput } from "@/components/form/money-input";
import { PresentacionPicker } from "@/components/form/presentacion-picker";
import { SelectField, type Opcion } from "@/components/form/select-field";
import { fechaInput, hoyLima } from "@/lib/dates";
import { formatPEN } from "@/lib/money";
import { handleActionResult } from "@/lib/notify";
import { guardarCompraAction } from "../actions";
import { EMPAQUE_LABELS, TIPOS_EMPAQUE, UNIDADES_EMPAQUE, type TipoEmpaque } from "../constants";
import type { CompraDetalleDTO, PresentacionCompraOpcion } from "../queries";
import { compraSchema, type CompraInput, type CompraOutput, type DetalleCompraInput } from "../schemas";

const OPCIONES_EMPAQUE = TIPOS_EMPAQUE.map((e) => ({
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
            <div className="rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-56">Producto</TableHead>
                    <TableHead className="w-32">Empaque</TableHead>
                    <TableHead className="w-24">Und./emp.</TableHead>
                    <TableHead className="w-24">Cantidad</TableHead>
                    <TableHead className="w-36">Costo x empaque</TableHead>
                    <TableHead className="text-right">Unidades</TableHead>
                    <TableHead className="text-right">Costo unit.</TableHead>
                    <TableHead className="text-right">Subtotal</TableHead>
                    <TableHead className="w-10" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {fields.map((field, i) => {
                    const d = detalles[i];
                    const e = errors.detalles?.[i];
                    const calc = d ? calcularLinea(d) : null;
                    return (
                      <TableRow key={field.key} className="align-top">
                        <TableCell className="whitespace-normal">
                          <div className="text-sm font-medium">{nombres.get(field.presentacionId)?.label ?? "—"}</div>
                          {e?.presentacionId && <p className="text-xs text-destructive">{e.presentacionId.message}</p>}
                        </TableCell>
                        <TableCell>
                          <SelectField
                            value={d?.empaque ?? "UNIDAD"}
                            onChange={(v) => cambiarEmpaque(i, v as TipoEmpaque)}
                            opciones={OPCIONES_EMPAQUE}
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            inputMode="numeric"
                            aria-label="Unidades por empaque"
                            disabled={d?.empaque !== "CAJA"}
                            aria-invalid={!!e?.unidadesPorEmpaque}
                            {...form.register(`detalles.${i}.unidadesPorEmpaque`)}
                          />
                          {e?.unidadesPorEmpaque && <p className="text-xs text-destructive">{e.unidadesPorEmpaque.message}</p>}
                        </TableCell>
                        <TableCell>
                          <Input
                            inputMode="numeric"
                            aria-label="Cantidad de empaques"
                            aria-invalid={!!e?.cantidadEmpaques}
                            {...form.register(`detalles.${i}.cantidadEmpaques`)}
                          />
                          {e?.cantidadEmpaques && <p className="text-xs text-destructive">{e.cantidadEmpaques.message}</p>}
                        </TableCell>
                        <TableCell>
                          <MoneyInput
                            aria-label="Costo por empaque"
                            aria-invalid={!!e?.costoEmpaque}
                            {...form.register(`detalles.${i}.costoEmpaque`)}
                          />
                          {e?.costoEmpaque && <p className="text-xs text-destructive">{e.costoEmpaque.message}</p>}
                        </TableCell>
                        <TableCell className="pt-4 text-right tabular-nums">{calc?.unidadesTotales ?? 0}</TableCell>
                        <TableCell className="pt-4 text-right tabular-nums">
                          {calc ? formatPEN(calc.costoUnitario) : "—"}
                        </TableCell>
                        <TableCell className="pt-4 text-right font-medium tabular-nums">
                          {calc ? formatPEN(calc.subtotal) : "—"}
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
                <TableFooter>
                  <TableRow>
                    <TableCell colSpan={7} className="text-right font-medium">
                      Total
                    </TableCell>
                    <TableCell className="text-right text-base font-semibold tabular-nums">{formatPEN(total)}</TableCell>
                    <TableCell />
                  </TableRow>
                </TableFooter>
              </Table>
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
