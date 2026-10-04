"use client";

import { useState, useTransition } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { PlusIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Field, FieldContent, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { EstadoBadge } from "@/components/data/estado-badge";
import { handleActionResult } from "@/lib/notify";
import { guardarMetodoPagoAction } from "../actions";
import { metodoPagoSchema, type MetodoPagoInput, type MetodoPagoOutput } from "../schemas";
import type { MetodoPagoDTO } from "../queries";
import { CatalogoAcciones } from "./catalogo-acciones";

function MetodoPagoDialog({ registro, onClose }: { registro?: MetodoPagoDTO; onClose: () => void }) {
  const [pending, startTransition] = useTransition();
  const form = useForm<MetodoPagoInput, unknown, MetodoPagoOutput>({
    resolver: zodResolver(metodoPagoSchema),
    defaultValues: {
      id: registro?.id,
      nombre: registro?.nombre ?? "",
      esEfectivo: registro?.esEfectivo ?? false,
      requiereReferencia: registro?.requiereReferencia ?? false,
      orden: String(registro?.orden ?? 0),
    },
  });
  const { errors } = form.formState;

  const onSubmit = form.handleSubmit(() => {
    const values = form.getValues();
    startTransition(async () => {
      const result = await guardarMetodoPagoAction(values);
      if (handleActionResult(result, form.setError)) onClose();
    });
  });

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <form onSubmit={onSubmit} noValidate className="grid gap-4">
          <DialogHeader>
            <DialogTitle>{registro ? "Editar método de pago" : "Nuevo método de pago"}</DialogTitle>
          </DialogHeader>
          <FieldGroup>
            <div className="grid grid-cols-[1fr_6rem] gap-4">
              <Field data-invalid={!!errors.nombre}>
                <FieldLabel htmlFor="metodo-nombre">Nombre</FieldLabel>
                <Input
                  id="metodo-nombre"
                  autoFocus
                  placeholder="Ej. Yape"
                  aria-invalid={!!errors.nombre}
                  {...form.register("nombre")}
                />
                <FieldError errors={[errors.nombre]} />
              </Field>
              <Field data-invalid={!!errors.orden}>
                <FieldLabel htmlFor="metodo-orden">Orden</FieldLabel>
                <Input id="metodo-orden" inputMode="numeric" aria-invalid={!!errors.orden} {...form.register("orden")} />
                <FieldError errors={[errors.orden]} />
              </Field>
            </div>
            <Controller
              control={form.control}
              name="esEfectivo"
              render={({ field }) => (
                <Field orientation="horizontal">
                  <FieldContent>
                    <FieldLabel htmlFor="metodo-efectivo">Es efectivo</FieldLabel>
                    <FieldDescription>Permite registrar el monto recibido y calcular el vuelto.</FieldDescription>
                  </FieldContent>
                  <Switch id="metodo-efectivo" checked={field.value} onCheckedChange={field.onChange} />
                </Field>
              )}
            />
            <Controller
              control={form.control}
              name="requiereReferencia"
              render={({ field }) => (
                <Field orientation="horizontal">
                  <FieldContent>
                    <FieldLabel htmlFor="metodo-referencia">Pedir n° de operación</FieldLabel>
                    <FieldDescription>Obliga a anotar el número de operación al registrar el pago.</FieldDescription>
                  </FieldContent>
                  <Switch id="metodo-referencia" checked={field.value} onCheckedChange={field.onChange} />
                </Field>
              )}
            />
          </FieldGroup>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={pending}>
              Cancelar
            </Button>
            <Button type="submit" disabled={pending}>
              {pending && <Spinner />}
              Guardar
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function MetodosPagoTable({ items }: { items: MetodoPagoDTO[] }) {
  const [dialogo, setDialogo] = useState<{ registro?: MetodoPagoDTO } | null>(null);

  return (
    <div className="grid gap-4">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">Formas en que los clientes pagan (solo se anotan, sin conexión a apps).</p>
        <Button onClick={() => setDialogo({})}>
          <PlusIcon />
          Nuevo método
        </Button>
      </div>
      <div className="rounded-xl border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-16">Orden</TableHead>
              <TableHead>Método</TableHead>
              <TableHead>Opciones</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="w-12">
                <span className="sr-only">Acciones</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((m) => (
              <TableRow key={m.id} className={m.activo ? undefined : "text-muted-foreground"}>
                <TableCell className="tabular-nums">{m.orden}</TableCell>
                <TableCell className="font-medium">{m.nombre}</TableCell>
                <TableCell className="space-x-1">
                  {m.esEfectivo && <Badge variant="secondary">Efectivo</Badge>}
                  {m.requiereReferencia && <Badge variant="secondary">Pide n° operación</Badge>}
                </TableCell>
                <TableCell>
                  <EstadoBadge activo={m.activo} />
                </TableCell>
                <TableCell>
                  <CatalogoAcciones entidad="metodoPago" registro={m} onEditar={() => setDialogo({ registro: m })} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      {dialogo && <MetodoPagoDialog registro={dialogo.registro} onClose={() => setDialogo(null)} />}
    </div>
  );
}
