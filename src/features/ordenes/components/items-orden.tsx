"use client";

import { useState, useTransition } from "react";
import { PackageIcon, PlusIcon, Trash2Icon, WrenchIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { FieldGroup } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { ConfirmDialog } from "@/components/data/confirm-dialog";
import { FormField } from "@/components/form/form-field";
import { MoneyInput } from "@/components/form/money-input";
import { PresentacionPicker } from "@/components/form/presentacion-picker";
import { SelectField } from "@/components/form/select-field";
import type { FieldErrors } from "@/lib/action-result";
import { aCentimos, deCentimos, formatPEN } from "@/lib/money";
import { handleActionResult } from "@/lib/notify";
import type { LineaVentaDTO, ProductoVentaOpcion } from "@/features/ventas/queries";
import { agregarItemOrdenAction, quitarItemOrdenAction } from "../actions";
import type { ServicioOpcion } from "../queries";

type Props = {
  ordenId: number;
  numero: string;
  lineas: LineaVentaDTO[];
  total: string;
  totalLista: string;
  editable: boolean;
  servicios: ServicioOpcion[];
  productos: ProductoVentaOpcion[];
  puedeBajoMinimo: boolean;
};

function AgregarItemDialog({
  ordenId,
  servicios,
  productos,
  puedeBajoMinimo,
  onClose,
}: Pick<Props, "ordenId" | "servicios" | "productos" | "puedeBajoMinimo"> & { onClose: () => void }) {
  const [pending, startTransition] = useTransition();
  const [tipo, setTipo] = useState<"SERVICIO" | "PRODUCTO">("SERVICIO");
  const [servicioId, setServicioId] = useState("");
  const [producto, setProducto] = useState<ProductoVentaOpcion | null>(null);
  const [cantidad, setCantidad] = useState("1");
  const [precio, setPrecio] = useState("");
  const [errores, setErrores] = useState<FieldErrors>({});
  const error = (k: string) => (errores[k]?.[0] ? { message: errores[k][0] } : undefined);

  const bajoMinimo = tipo === "PRODUCTO" && !!producto && precio !== "" && aCentimos(precio) < aCentimos(producto.precioMinimo);
  const sinStock = tipo === "PRODUCTO" && !!producto && (Number(cantidad) || 0) > producto.stock;
  const subtotal = aCentimos(precio) * (Number(cantidad) || 0);

  const cambiarTipo = (t: "SERVICIO" | "PRODUCTO") => {
    setTipo(t);
    setServicioId("");
    setProducto(null);
    setPrecio("");
    setCantidad("1");
    setErrores({});
  };

  const agregar = () => {
    startTransition(async () => {
      const result = await agregarItemOrdenAction({
        ordenId,
        tipo,
        servicioId: tipo === "SERVICIO" && servicioId ? Number(servicioId) : null,
        presentacionId: tipo === "PRODUCTO" ? (producto?.id ?? null) : null,
        cantidad,
        precioUnitario: precio,
      });
      if (handleActionResult(result)) onClose();
      else setErrores(result.fieldErrors ?? {});
    });
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Agregar a la orden</DialogTitle>
          <DialogDescription>Los repuestos se descuentan del stock al agregarlos.</DialogDescription>
        </DialogHeader>
        <ToggleGroup
          value={[tipo]}
          onValueChange={(v) => v[0] && cambiarTipo(v[0] as "SERVICIO" | "PRODUCTO")}
          variant="outline"
          className="w-full"
        >
          <ToggleGroupItem value="SERVICIO" className="flex-1">
            <WrenchIcon />
            Servicio
          </ToggleGroupItem>
          <ToggleGroupItem value="PRODUCTO" className="flex-1">
            <PackageIcon />
            Repuesto
          </ToggleGroupItem>
        </ToggleGroup>
        <FieldGroup>
          {tipo === "SERVICIO" ? (
            <FormField label="Servicio" htmlFor="servicioId" error={error("servicioId")}>
              <SelectField
                id="servicioId"
                value={servicioId}
                onChange={(v) => {
                  setServicioId(v);
                  setPrecio(servicios.find((s) => String(s.id) === v)?.precio ?? "");
                }}
                opciones={servicios.map((s) => ({ value: String(s.id), label: `${s.nombre} · ${formatPEN(s.precio)}` }))}
                placeholder={servicios.length ? "Selecciona el servicio" : "No hay servicios en el catálogo"}
                invalid={!!error("servicioId")}
              />
            </FormField>
          ) : (
            <FormField
              label="Repuesto"
              error={error("presentacionId")}
              description={
                producto
                  ? `${producto.label} · Stock: ${producto.stock} · Lista: ${formatPEN(producto.precioVenta)}`
                  : "Busca por nombre o código"
              }
            >
              <PresentacionPicker
                items={productos.map((p) => ({ ...p, detalle: `${formatPEN(p.precioVenta)} · Stock: ${p.stock}` }))}
                onSelect={(p) => {
                  setProducto(p);
                  setPrecio(p.precioVenta);
                }}
                placeholder={producto ? "Cambiar repuesto…" : "Buscar repuesto…"}
              />
            </FormField>
          )}
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="Cantidad" htmlFor="cantidad" error={error("cantidad") ?? (sinStock ? { message: `Solo hay ${producto?.stock}` } : undefined)}>
              <Input
                id="cantidad"
                inputMode="numeric"
                value={cantidad}
                aria-invalid={sinStock || !!error("cantidad")}
                onChange={(e) => setCantidad(e.target.value.replace(/\D/g, ""))}
              />
            </FormField>
            <FormField
              label="Precio unitario"
              htmlFor="precio"
              error={error("precioUnitario")}
              description={
                bajoMinimo ? (
                  <span className={puedeBajoMinimo ? "text-amber-600 dark:text-amber-400" : "text-destructive"}>
                    Mínimo {formatPEN(producto?.precioMinimo)}
                  </span>
                ) : undefined
              }
            >
              <MoneyInput
                id="precio"
                value={precio}
                aria-invalid={(bajoMinimo && !puedeBajoMinimo) || !!error("precioUnitario")}
                onChange={(e) => setPrecio(e.target.value)}
              />
            </FormField>
          </div>
        </FieldGroup>
        <div className="flex justify-between rounded-lg border bg-muted/20 p-3 text-sm">
          <span className="text-muted-foreground">Subtotal</span>
          <span className="font-semibold tabular-nums">{formatPEN(deCentimos(subtotal))}</span>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={pending}>
            Cancelar
          </Button>
          <Button onClick={agregar} disabled={pending || sinStock || (bajoMinimo && !puedeBajoMinimo)}>
            {pending && <Spinner />}
            Agregar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function ItemsOrden({ ordenId, numero, lineas, total, totalLista, editable, servicios, productos, puedeBajoMinimo }: Props) {
  const [agregando, setAgregando] = useState(false);
  const [quitar, setQuitar] = useState<LineaVentaDTO | null>(null);
  const conDescuento = totalLista !== total;

  return (
    <>
      {lineas.length === 0 ? (
        <div className="mx-6 flex flex-col items-center gap-2 rounded-lg border border-dashed py-8 text-center text-sm text-muted-foreground">
          Aún no hay servicios ni repuestos.
          {editable && (
            <Button size="sm" onClick={() => setAgregando(true)}>
              <PlusIcon />
              Agregar servicio o repuesto
            </Button>
          )}
        </div>
      ) : (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-6">Descripción</TableHead>
                <TableHead className="text-right">Cant.</TableHead>
                <TableHead className="text-right">Precio unit.</TableHead>
                <TableHead className="text-right">Subtotal</TableHead>
                <TableHead className="w-12 pr-6" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {lineas.map((l) => (
                <TableRow key={l.id}>
                  <TableCell className="pl-6 whitespace-normal">
                    <div className="flex items-center gap-2 font-medium">
                      {l.descripcion}
                      <Badge variant="secondary">{l.tipoItem === "SERVICIO" ? "Servicio" : "Repuesto"}</Badge>
                    </div>
                    {l.codigo && <div className="font-mono text-xs text-muted-foreground">{l.codigo}</div>}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{l.cantidad}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatPEN(l.precioUnitario)}
                    {l.precioUnitario !== l.precioLista && (
                      <div className="text-xs text-muted-foreground line-through">{formatPEN(l.precioLista)}</div>
                    )}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{formatPEN(l.subtotal)}</TableCell>
                  <TableCell className="pr-6">
                    {editable && (
                      <Button variant="ghost" size="icon-sm" aria-label="Quitar" title="Quitar" onClick={() => setQuitar(l)}>
                        <Trash2Icon />
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
            <TableFooter>
              {conDescuento && (
                <TableRow>
                  <TableCell colSpan={3} className="pl-6 text-right text-muted-foreground">
                    Precio de lista
                  </TableCell>
                  <TableCell className="text-right text-muted-foreground tabular-nums">{formatPEN(totalLista)}</TableCell>
                  <TableCell />
                </TableRow>
              )}
              <TableRow>
                <TableCell colSpan={3} className="pl-6 text-right font-medium">
                  Total
                </TableCell>
                <TableCell className="text-right font-semibold tabular-nums">{formatPEN(total)}</TableCell>
                <TableCell />
              </TableRow>
            </TableFooter>
          </Table>
          {editable && (
            <div className="px-6 pt-3">
              <Button variant="outline" size="sm" onClick={() => setAgregando(true)}>
                <PlusIcon />
                Agregar servicio o repuesto
              </Button>
            </div>
          )}
        </>
      )}

      {agregando && (
        <AgregarItemDialog
          ordenId={ordenId}
          servicios={servicios}
          productos={productos}
          puedeBajoMinimo={puedeBajoMinimo}
          onClose={() => setAgregando(false)}
        />
      )}
      <ConfirmDialog
        open={!!quitar}
        onOpenChange={(open) => !open && setQuitar(null)}
        titulo="¿Quitar de la orden?"
        descripcion={
          quitar?.tipoItem === "PRODUCTO"
            ? `"${quitar.descripcion}" (${quitar.cantidad}) volverá al stock. Orden ${numero}.`
            : `Se quitará "${quitar?.descripcion}" de la orden ${numero}.`
        }
        confirmarTexto="Quitar"
        destructivo
        onConfirm={() => quitarItemOrdenAction({ detalleId: quitar!.id })}
      />
    </>
  );
}
