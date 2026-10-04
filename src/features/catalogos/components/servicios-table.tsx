"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { PlusIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { InputGroup, InputGroupAddon, InputGroupInput, InputGroupText } from "@/components/ui/input-group";
import { Spinner } from "@/components/ui/spinner";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { EstadoBadge } from "@/components/data/estado-badge";
import { formatPEN } from "@/lib/money";
import { handleActionResult } from "@/lib/notify";
import { guardarServicioAction } from "../actions";
import { servicioSchema, type ServicioInput, type ServicioOutput } from "../schemas";
import type { ServicioDTO } from "../queries";
import { CatalogoAcciones } from "./catalogo-acciones";

function ServicioDialog({ registro, onClose }: { registro?: ServicioDTO; onClose: () => void }) {
  const [pending, startTransition] = useTransition();
  const form = useForm<ServicioInput, unknown, ServicioOutput>({
    resolver: zodResolver(servicioSchema),
    defaultValues: {
      id: registro?.id,
      nombre: registro?.nombre ?? "",
      descripcion: registro?.descripcion ?? "",
      precioReferencial: registro?.precioReferencial ?? "",
    },
  });
  const { errors } = form.formState;

  const onSubmit = form.handleSubmit(() => {
    const values = form.getValues();
    startTransition(async () => {
      const result = await guardarServicioAction(values);
      if (handleActionResult(result, form.setError)) onClose();
    });
  });

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <form onSubmit={onSubmit} noValidate className="grid gap-4">
          <DialogHeader>
            <DialogTitle>{registro ? "Editar servicio" : "Nuevo servicio"}</DialogTitle>
          </DialogHeader>
          <FieldGroup>
            <Field data-invalid={!!errors.nombre}>
              <FieldLabel htmlFor="servicio-nombre">Nombre</FieldLabel>
              <Input
                id="servicio-nombre"
                autoFocus
                placeholder="Ej. Cambio de batería"
                aria-invalid={!!errors.nombre}
                {...form.register("nombre")}
              />
              <FieldError errors={[errors.nombre]} />
            </Field>
            <Field data-invalid={!!errors.precioReferencial}>
              <FieldLabel htmlFor="servicio-precio">Precio referencial</FieldLabel>
              <InputGroup>
                <InputGroupAddon>
                  <InputGroupText>S/</InputGroupText>
                </InputGroupAddon>
                <InputGroupInput
                  id="servicio-precio"
                  inputMode="decimal"
                  placeholder="0.00"
                  aria-invalid={!!errors.precioReferencial}
                  {...form.register("precioReferencial")}
                />
              </InputGroup>
              <FieldDescription>Se sugiere al cobrar; se puede cambiar en cada orden.</FieldDescription>
              <FieldError errors={[errors.precioReferencial]} />
            </Field>
            <Field data-invalid={!!errors.descripcion}>
              <FieldLabel htmlFor="servicio-descripcion">Descripción (opcional)</FieldLabel>
              <Textarea id="servicio-descripcion" rows={2} {...form.register("descripcion")} />
              <FieldError errors={[errors.descripcion]} />
            </Field>
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

export function ServiciosTable({ items }: { items: ServicioDTO[] }) {
  const [dialogo, setDialogo] = useState<{ registro?: ServicioDTO } | null>(null);

  return (
    <div className="grid gap-4">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">Servicios técnicos que se cobran en las órdenes de servicio.</p>
        <Button onClick={() => setDialogo({})}>
          <PlusIcon />
          Nuevo servicio
        </Button>
      </div>
      <div className="rounded-xl border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Servicio</TableHead>
              <TableHead className="text-right">Precio ref.</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="w-12">
                <span className="sr-only">Acciones</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                  Aún no hay servicios.
                </TableCell>
              </TableRow>
            )}
            {items.map((s) => (
              <TableRow key={s.id} className={s.activo ? undefined : "text-muted-foreground"}>
                <TableCell>
                  <div className="font-medium">{s.nombre}</div>
                  {s.descripcion && <div className="text-xs text-muted-foreground">{s.descripcion}</div>}
                </TableCell>
                <TableCell className="text-right tabular-nums">{formatPEN(s.precioReferencial)}</TableCell>
                <TableCell>
                  <EstadoBadge activo={s.activo} />
                </TableCell>
                <TableCell>
                  <CatalogoAcciones entidad="servicio" registro={s} onEditar={() => setDialogo({ registro: s })} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      {dialogo && <ServicioDialog registro={dialogo.registro} onClose={() => setDialogo(null)} />}
    </div>
  );
}
