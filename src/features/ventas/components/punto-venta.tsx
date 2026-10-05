"use client";

import { useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BanknoteIcon, CheckCircle2Icon, MinusIcon, PlusIcon, ScanBarcodeIcon, ShoppingCartIcon, Trash2Icon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Field, FieldContent, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import { Spinner } from "@/components/ui/spinner";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { MoneyInput } from "@/components/form/money-input";
import { PresentacionPicker } from "@/components/form/presentacion-picker";
import { SelectField } from "@/components/form/select-field";
import type { FieldErrors } from "@/lib/action-result";
import { aCentimos, deCentimos, formatPEN } from "@/lib/money";
import { handleActionResult, notify } from "@/lib/notify";
import { cn } from "@/lib/utils";
import { CompartirBotones } from "@/features/impresion/components/compartir-botones";
import { emitirVentaAction } from "../actions";
import type { ClienteVentaOpcion, MetodoPagoVenta, ProductoVentaOpcion } from "../queries";
import type { VentaEmitida } from "../service";
import type { VentaInput } from "../schemas";
import { ClienteSelector } from "./cliente-selector";

type Linea = { presentacionId: number; cantidad: string; precio: string };
type PagoLinea = {
  key: number;
  metodoPagoId: number;
  monto: string;
  /** Mientras sea true, el monto sigue al saldo pendiente */
  auto: boolean;
  recibido: string;
  referencia: string;
};

type Props = {
  productos: ProductoVentaOpcion[];
  clientes: ClienteVentaOpcion[];
  metodos: MetodoPagoVenta[];
  puedeBajoMinimo: boolean;
  puedeCrearCliente: boolean;
};

let siguienteKey = 1;

/** Columnas del carrito cuando la tarjeta es ancha: producto · cantidad · precio · subtotal · quitar */
const COLUMNAS_POS = "@xl:grid-cols-[minmax(0,1fr)_8.5rem_9rem_6.5rem_2rem] @xl:items-start";

export function PuntoVenta({ productos, clientes: clientesIniciales, metodos, puedeBajoMinimo, puedeCrearCliente }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const escaner = useRef<HTMLInputElement>(null);
  const metodoInicial = metodos.find((m) => m.esEfectivo) ?? metodos[0];
  const pagoInicial = (): PagoLinea[] =>
    metodoInicial ? [{ key: siguienteKey++, metodoPagoId: metodoInicial.id, monto: "", auto: true, recibido: "", referencia: "" }] : [];

  const [lineas, setLineas] = useState<Linea[]>([]);
  const [clientes, setClientes] = useState(clientesIniciales);
  const [cliente, setCliente] = useState<ClienteVentaOpcion | null>(null);
  const [pagos, setPagos] = useState<PagoLinea[]>(pagoInicial);
  const [entregado, setEntregado] = useState(true);
  const [observaciones, setObservaciones] = useState("");
  const [codigo, setCodigo] = useState("");
  const [errores, setErrores] = useState<FieldErrors>({});
  const [resultado, setResultado] = useState<VentaEmitida | null>(null);

  const porId = new Map(productos.map((p) => [p.id, p]));
  const metodoPorId = new Map(metodos.map((m) => [m.id, m]));

  // ── Totales (en céntimos) ──
  const subtotal = (l: Linea) => aCentimos(l.precio) * (Number(l.cantidad) || 0);
  const totalLista = lineas.reduce((s, l) => s + aCentimos(porId.get(l.presentacionId)?.precioVenta) * (Number(l.cantidad) || 0), 0);
  const total = lineas.reduce((s, l) => s + subtotal(l), 0);
  const manuales = pagos.filter((p) => !p.auto).reduce((s, p) => s + aCentimos(p.monto), 0);
  const montoPago = (p: PagoLinea) => (p.auto ? Math.max(total - manuales, 0) : aCentimos(p.monto));
  const pagado = pagos.reduce((s, p) => s + montoPago(p), 0);
  const saldo = total - pagado;
  const vuelto = pagos.reduce((s, p) => {
    if (!metodoPorId.get(p.metodoPagoId)?.esEfectivo || p.recibido === "") return s;
    return s + Math.max(aCentimos(p.recibido) - montoPago(p), 0);
  }, 0);
  const requiereCliente = saldo > 0 || !entregado;

  // ── Productos ──
  const agregar = (p: ProductoVentaOpcion) => {
    const existente = lineas.find((l) => l.presentacionId === p.id);
    const enCarrito = existente ? Number(existente.cantidad) || 0 : 0;
    if (p.stock <= enCarrito) {
      notify.warning("Sin stock suficiente", `${p.label}: hay ${p.stock} en stock.`);
      return;
    }
    setLineas((prev) =>
      existente
        ? prev.map((l) => (l.presentacionId === p.id ? { ...l, cantidad: String(enCarrito + 1) } : l))
        : [...prev, { presentacionId: p.id, cantidad: "1", precio: p.precioVenta }],
    );
    setErrores({});
  };

  const escanear = () => {
    const buscado = codigo.trim().toUpperCase();
    if (!buscado) return;
    const p = productos.find((x) => x.codigo.toUpperCase() === buscado || x.codigoBarras?.toUpperCase() === buscado);
    if (p) agregar(p);
    else notify.error("Código no encontrado", `No hay un producto activo con el código "${codigo.trim()}".`);
    setCodigo("");
    escaner.current?.focus();
  };

  const actualizarLinea = (i: number, cambios: Partial<Linea>) =>
    setLineas((prev) => prev.map((l, idx) => (idx === i ? { ...l, ...cambios } : l)));

  // ── Pagos ──
  const actualizarPago = (key: number, cambios: Partial<PagoLinea>) =>
    setPagos((prev) => prev.map((p) => (p.key === key ? { ...p, ...cambios } : p)));

  const agregarPago = () => {
    const usados = new Set(pagos.map((p) => p.metodoPagoId));
    const metodo = metodos.find((m) => !usados.has(m.id)) ?? metodos[0];
    if (!metodo) return;
    // Al agregar otro pago, el actual deja de seguir el total para poder repartir
    setPagos((prev) => [
      ...prev.map((p) => (p.auto ? { ...p, auto: false, monto: deCentimos(montoPago(p)) } : p)),
      { key: siguienteKey++, metodoPagoId: metodo.id, monto: "", auto: false, recibido: "", referencia: "" },
    ]);
  };

  const reiniciar = () => {
    setLineas([]);
    setCliente(null);
    setPagos(pagoInicial());
    setEntregado(true);
    setObservaciones("");
    setErrores({});
    setResultado(null);
    router.refresh(); // stock actualizado
    setTimeout(() => escaner.current?.focus(), 50);
  };

  // ── Emitir ──
  const emitir = () => {
    if (lineas.length === 0) {
      notify.error("Agrega al menos un producto");
      return;
    }
    if (requiereCliente && !cliente) {
      notify.error("Selecciona el cliente", "Para dejar saldo pendiente o entregar después, el cliente es obligatorio.");
      setErrores({ cliente: ["Obligatorio si queda saldo o no se entrega"] });
      return;
    }
    const datos: VentaInput = {
      clienteId: cliente?.id ?? null,
      entregado,
      observaciones,
      items: lineas.map((l) => ({ presentacionId: l.presentacionId, cantidad: l.cantidad.trim(), precioUnitario: l.precio.trim() })),
      pagos: pagos
        .filter((p) => montoPago(p) > 0)
        .map((p) => ({
          metodoPagoId: p.metodoPagoId,
          monto: deCentimos(montoPago(p)),
          montoRecibido: metodoPorId.get(p.metodoPagoId)?.esEfectivo ? p.recibido.trim() : "",
          referencia: p.referencia,
        })),
    };
    startTransition(async () => {
      const result = await emitirVentaAction(datos);
      if (handleActionResult(result)) setResultado(result.data);
      else setErrores(result.fieldErrors ?? {});
    });
  };

  const error = (clave: string) => errores[clave]?.[0];

  return (
    <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,1fr)_24rem]">
      {/* ── Carrito ── */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShoppingCartIcon className="size-4" /> Productos
          </CardTitle>
          {lineas.length > 0 && (
            <CardAction>
              <Button variant="ghost" size="sm" onClick={() => setLineas([])}>
                Vaciar
              </Button>
            </CardAction>
          )}
        </CardHeader>
        <CardContent className="grid gap-3">
          <div className="grid gap-2 sm:grid-cols-[14rem_1fr]">
            <InputGroup>
              <InputGroupAddon>
                <ScanBarcodeIcon />
              </InputGroupAddon>
              <InputGroupInput
                ref={escaner}
                autoFocus
                placeholder="Escanear código + Enter"
                value={codigo}
                onChange={(e) => setCodigo(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    escanear();
                  }
                }}
                aria-label="Código o código de barras"
              />
            </InputGroup>
            <PresentacionPicker
              items={productos.map((p) => ({ ...p, detalle: `${formatPEN(p.precioVenta)} · Stock: ${p.stock}` }))}
              onSelect={agregar}
            />
          </div>
          {error("items") && <p className="text-sm text-destructive">{error("items")}</p>}

          {lineas.length === 0 ? (
            <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed py-16 text-center text-sm text-muted-foreground">
              <ScanBarcodeIcon className="size-8" />
              Escanea o busca productos para agregarlos.
            </div>
          ) : (
            // Angosto (celular): cada producto es una tarjeta con los campos uno debajo de otro.
            // Ancho: filas tipo tabla. Depende del ancho de la tarjeta (@container), no de la pantalla.
            <div className="@container rounded-lg border">
              <div className={cn("hidden border-b px-3 py-2 text-xs font-medium text-muted-foreground @xl:grid", COLUMNAS_POS)}>
                <span>Producto</span>
                <span>Cantidad</span>
                <span>Precio unit.</span>
                <span className="text-right">Subtotal</span>
              </div>
              <div className="divide-y">
                {lineas.map((l, i) => {
                  const p = porId.get(l.presentacionId);
                  const cantidad = Number(l.cantidad) || 0;
                  const sinStock = !!p && cantidad > p.stock;
                  const bajoMinimo = !!p && l.precio !== "" && aCentimos(l.precio) < aCentimos(p.precioMinimo);
                  const conDescuento = !!p && aCentimos(l.precio) < aCentimos(p.precioVenta);
                  const errCantidad = error(`items.${i}.cantidad`);
                  const errPrecio = error(`items.${i}.precioUnitario`);
                  return (
                    <div key={l.presentacionId} className={cn("grid gap-3 p-3", COLUMNAS_POS)}>
                      {/* Nombre y quitar (en ancho, "quitar" va a la última columna) */}
                      <div className="flex items-start gap-2 @xl:contents">
                        <div className="min-w-0 flex-1">
                          <div className="text-sm font-medium">{p?.label ?? "Producto no disponible"}</div>
                          <div className="text-xs text-muted-foreground">
                            Stock: {p?.stock ?? 0} · Lista: {formatPEN(p?.precioVenta)}
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          aria-label="Quitar"
                          className="@xl:col-start-5 @xl:row-start-1"
                          onClick={() => setLineas((prev) => prev.filter((_, idx) => idx !== i))}
                        >
                          <Trash2Icon />
                        </Button>
                      </div>

                      <div className="grid grid-cols-2 gap-3 @xl:contents">
                        <div className="min-w-0">
                          <span className="mb-1 block text-xs text-muted-foreground @xl:sr-only">Cantidad</span>
                          <div className="flex items-center gap-1">
                            <Button
                              variant="outline"
                              size="icon-sm"
                              aria-label="Restar uno"
                              disabled={cantidad <= 1}
                              onClick={() => actualizarLinea(i, { cantidad: String(cantidad - 1) })}
                            >
                              <MinusIcon />
                            </Button>
                            <Input
                              className="h-7 min-w-0 flex-1 text-center @xl:w-14 @xl:flex-none"
                              inputMode="numeric"
                              aria-label="Cantidad"
                              aria-invalid={sinStock || !!errCantidad}
                              value={l.cantidad}
                              onChange={(e) => actualizarLinea(i, { cantidad: e.target.value.replace(/\D/g, "") })}
                            />
                            <Button
                              variant="outline"
                              size="icon-sm"
                              aria-label="Sumar uno"
                              disabled={!!p && cantidad >= p.stock}
                              onClick={() => actualizarLinea(i, { cantidad: String(cantidad + 1) })}
                            >
                              <PlusIcon />
                            </Button>
                          </div>
                          {sinStock && <p className="mt-1 text-xs text-destructive">Solo hay {p.stock}</p>}
                          {errCantidad && <p className="mt-1 text-xs text-destructive">{errCantidad}</p>}
                        </div>
                        <div className="min-w-0">
                          <span className="mb-1 block text-xs text-muted-foreground @xl:sr-only">Precio unit.</span>
                          <MoneyInput
                            aria-label="Precio unitario"
                            aria-invalid={(bajoMinimo && !puedeBajoMinimo) || !!errPrecio}
                            value={l.precio}
                            onChange={(e) => actualizarLinea(i, { precio: e.target.value })}
                          />
                          {bajoMinimo ? (
                            <p className={cn("mt-1 text-xs", puedeBajoMinimo ? "text-amber-600 dark:text-amber-400" : "text-destructive")}>
                              Mínimo {formatPEN(p.precioMinimo)}
                            </p>
                          ) : (
                            conDescuento && <p className="mt-1 text-xs text-muted-foreground">Con descuento</p>
                          )}
                          {errPrecio && <p className="mt-1 text-xs text-destructive">{errPrecio}</p>}
                        </div>
                      </div>

                      <div className="flex items-baseline justify-between @xl:block @xl:pt-1.5 @xl:text-right">
                        <span className="text-xs text-muted-foreground @xl:sr-only">Subtotal</span>
                        <span className="font-medium tabular-nums">{formatPEN(deCentimos(subtotal(l)))}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Cobro ── */}
      <div className="grid gap-4 lg:sticky lg:top-20">
        <Card>
          <CardHeader>
            <CardTitle>Cliente</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-2">
            <ClienteSelector
              clientes={clientes}
              value={cliente}
              onChange={(c) => {
                setCliente(c);
                setErrores((e) => ({ ...e, cliente: undefined }));
              }}
              onCreado={(c) => setClientes((prev) => [...prev, c].sort((a, b) => a.nombre.localeCompare(b.nombre)))}
              puedeCrear={puedeCrearCliente}
              invalid={!!error("cliente")}
            />
            {error("cliente") ? (
              <p className="text-xs text-destructive">{error("cliente")}</p>
            ) : (
              requiereCliente &&
              !cliente && <p className="text-xs text-amber-600 dark:text-amber-400">Queda saldo o entrega pendiente: el cliente es obligatorio.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Pago</CardTitle>
            <CardAction>
              <Button variant="ghost" size="sm" onClick={agregarPago} disabled={pagos.length >= metodos.length}>
                <PlusIcon />
                Otro método
              </Button>
            </CardAction>
          </CardHeader>
          <CardContent className="grid gap-3">
            <div className="grid gap-1 text-sm">
              {totalLista !== total && (
                <>
                  <div className="flex justify-between text-muted-foreground">
                    <span>Precio de lista</span>
                    <span className="tabular-nums">{formatPEN(deCentimos(totalLista))}</span>
                  </div>
                  <div className="flex justify-between text-muted-foreground">
                    <span>{totalLista > total ? "Descuento" : "Recargo"}</span>
                    <span className="tabular-nums">{formatPEN(deCentimos(Math.abs(totalLista - total)))}</span>
                  </div>
                </>
              )}
              <div className="flex items-baseline justify-between">
                <span className="font-medium">Total</span>
                <span className="text-2xl font-semibold tabular-nums">{formatPEN(deCentimos(total))}</span>
              </div>
            </div>

            {pagos.map((p, i) => {
              const metodo = metodoPorId.get(p.metodoPagoId);
              const monto = montoPago(p);
              return (
                <div key={p.key} className="grid gap-2 rounded-lg border bg-muted/20 p-3">
                  <div className="flex gap-2">
                    <SelectField
                      value={String(p.metodoPagoId)}
                      onChange={(v) => actualizarPago(p.key, { metodoPagoId: Number(v), recibido: "", referencia: "" })}
                      opciones={metodos.map((m) => ({ value: String(m.id), label: m.nombre }))}
                      className="w-full"
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label="Quitar pago"
                      title={pagos.length === 1 ? "Quitar para vender al crédito" : "Quitar pago"}
                      onClick={() => setPagos((prev) => prev.filter((x) => x.key !== p.key))}
                    >
                      <Trash2Icon />
                    </Button>
                  </div>
                  <div className={cn("grid gap-2", metodo?.esEfectivo && "grid-cols-2")}>
                    <div>
                      <label className="text-xs text-muted-foreground">Monto</label>
                      <MoneyInput
                        aria-label={`Monto ${metodo?.nombre ?? ""}`}
                        value={p.auto ? deCentimos(monto) : p.monto}
                        aria-invalid={!!error(`pagos.${i}.monto`)}
                        onChange={(e) => actualizarPago(p.key, { monto: e.target.value, auto: false })}
                      />
                    </div>
                    {metodo?.esEfectivo && (
                      <div>
                        <label className="text-xs text-muted-foreground">Recibido</label>
                        <MoneyInput
                          aria-label="Monto recibido"
                          placeholder={deCentimos(monto)}
                          value={p.recibido}
                          onChange={(e) => actualizarPago(p.key, { recibido: e.target.value })}
                        />
                      </div>
                    )}
                  </div>
                  {metodo?.requiereReferencia && (
                    <Input
                      placeholder="N° de operación"
                      value={p.referencia}
                      onChange={(e) => actualizarPago(p.key, { referencia: e.target.value })}
                    />
                  )}
                  {metodo?.esEfectivo && p.recibido !== "" && aCentimos(p.recibido) < monto && (
                    <p className="text-xs text-destructive">Lo recibido es menor al monto.</p>
                  )}
                </div>
              );
            })}
            {pagos.length === 0 && (
              <p className="rounded-lg border border-dashed p-3 text-center text-sm text-muted-foreground">
                Sin pago: venta al crédito.
              </p>
            )}

            <div className="grid gap-1 border-t pt-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Paga ahora</span>
                <span className="tabular-nums">{formatPEN(deCentimos(pagado))}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">{saldo < 0 ? "Exceso" : "Saldo pendiente"}</span>
                <span className={cn("tabular-nums", saldo !== 0 && "font-medium text-destructive")}>
                  {formatPEN(deCentimos(Math.abs(saldo)))}
                </span>
              </div>
              {vuelto > 0 && (
                <div className="flex items-baseline justify-between text-base">
                  <span className="font-medium">Vuelto</span>
                  <span className="font-semibold text-emerald-600 tabular-nums dark:text-emerald-400">
                    {formatPEN(deCentimos(vuelto))}
                  </span>
                </div>
              )}
            </div>

            <Field orientation="horizontal">
              <FieldContent>
                <FieldLabel htmlFor="entregado">Se entrega ahora</FieldLabel>
                <FieldDescription>Desmarca si el cliente recogerá después.</FieldDescription>
              </FieldContent>
              <Switch id="entregado" checked={entregado} onCheckedChange={setEntregado} />
            </Field>
            <Textarea
              rows={2}
              placeholder="Observaciones (opcional)"
              value={observaciones}
              onChange={(e) => setObservaciones(e.target.value)}
            />

            <Button size="lg" className="h-11 text-base" disabled={pending || lineas.length === 0 || saldo < 0} onClick={emitir}>
              {pending ? <Spinner /> : <BanknoteIcon />}
              {saldo > 0 ? "Emitir con saldo pendiente" : "Cobrar y emitir"}
            </Button>
          </CardContent>
        </Card>
      </div>

      {resultado && (
        <Dialog open onOpenChange={(open) => !open && reiniciar()}>
          <DialogContent className="sm:max-w-sm">
            <DialogHeader className="items-center text-center">
              <CheckCircle2Icon className="size-12 text-emerald-500" />
              <DialogTitle className="text-xl">Venta {resultado.numero}</DialogTitle>
              <DialogDescription>Venta emitida y stock actualizado.</DialogDescription>
            </DialogHeader>
            <div className="grid gap-1 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total</span>
                <span className="font-semibold tabular-nums">{formatPEN(resultado.total)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Pagado</span>
                <span className="tabular-nums">{formatPEN(resultado.pagado)}</span>
              </div>
              {Number(resultado.saldo) > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Saldo pendiente</span>
                  <Badge variant="destructive">{formatPEN(resultado.saldo)}</Badge>
                </div>
              )}
              {Number(resultado.vuelto) > 0 && (
                <div className="mt-2 flex items-baseline justify-between rounded-lg bg-emerald-500/10 p-3">
                  <span className="font-medium">Vuelto</span>
                  <span className="text-2xl font-semibold text-emerald-600 tabular-nums dark:text-emerald-400">
                    {formatPEN(resultado.vuelto)}
                  </span>
                </div>
              )}
            </div>
            <div className="grid grid-cols-2 gap-2">
              <CompartirBotones tipo="venta" id={resultado.id} numero={resultado.numero} className="w-full" />
            </div>
            <DialogFooter className="sm:flex-col">
              <Button className="w-full" autoFocus onClick={reiniciar}>
                Nueva venta
              </Button>
              <Button variant="ghost" className="w-full" nativeButton={false} render={<Link href={`/ventas/${resultado.id}`} />}>
                Ver venta
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
