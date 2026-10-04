"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { PlusIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { EstadoBadge } from "@/components/data/estado-badge";
import { handleActionResult } from "@/lib/notify";
import { guardarCatalogoSimpleAction } from "../actions";
import { CATALOGO_SIMPLE_LABELS, catalogoSimpleSchema, type CatalogoSimple, type CatalogoSimpleInput } from "../schemas";
import type { CatalogoSimpleDTO } from "../queries";
import { CatalogoAcciones } from "./catalogo-acciones";

type Dialogo = { registro?: CatalogoSimpleDTO } | null;

function CatalogoSimpleDialog({
  entidad,
  registro,
  onClose,
}: {
  entidad: CatalogoSimple;
  registro?: CatalogoSimpleDTO;
  onClose: () => void;
}) {
  const etiquetas = CATALOGO_SIMPLE_LABELS[entidad];
  const [pending, startTransition] = useTransition();
  const form = useForm<CatalogoSimpleInput>({
    resolver: zodResolver(catalogoSimpleSchema),
    defaultValues: { entidad, id: registro?.id, nombre: registro?.nombre ?? "" },
  });
  const { errors } = form.formState;

  const onSubmit = form.handleSubmit((values) => {
    startTransition(async () => {
      const result = await guardarCatalogoSimpleAction(values);
      if (handleActionResult(result, form.setError)) onClose();
    });
  });

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <form onSubmit={onSubmit} noValidate className="grid gap-4">
          <DialogHeader>
            <DialogTitle>{registro ? `Editar ${etiquetas.singular}` : `Nueva ${etiquetas.singular}`}</DialogTitle>
          </DialogHeader>
          <Field data-invalid={!!errors.nombre}>
            <FieldLabel htmlFor="catalogo-nombre">Nombre</FieldLabel>
            <Input
              id="catalogo-nombre"
              autoFocus
              placeholder={`Ej. ${etiquetas.ejemplo}`}
              aria-invalid={!!errors.nombre}
              {...form.register("nombre")}
            />
            <FieldError errors={[errors.nombre]} />
          </Field>
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

export function CatalogoSimpleTable({ entidad, items }: { entidad: CatalogoSimple; items: CatalogoSimpleDTO[] }) {
  const [dialogo, setDialogo] = useState<Dialogo>(null);
  const etiquetas = CATALOGO_SIMPLE_LABELS[entidad];

  return (
    <div className="grid gap-4">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">
          {items.length} {items.length === 1 ? "registro" : "registros"}
        </p>
        <Button onClick={() => setDialogo({})}>
          <PlusIcon />
          Nueva {etiquetas.singular}
        </Button>
      </div>
      <div className="rounded-xl border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nombre</TableHead>
              <TableHead>Productos</TableHead>
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
                  Aún no hay registros.
                </TableCell>
              </TableRow>
            )}
            {items.map((item) => (
              <TableRow key={item.id} className={item.activo ? undefined : "text-muted-foreground"}>
                <TableCell className="font-medium">{item.nombre}</TableCell>
                <TableCell>
                  <Badge variant="secondary">{item.enUso}</Badge>
                </TableCell>
                <TableCell>
                  <EstadoBadge activo={item.activo} />
                </TableCell>
                <TableCell>
                  <CatalogoAcciones entidad={entidad} registro={item} onEditar={() => setDialogo({ registro: item })} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      {dialogo && (
        <CatalogoSimpleDialog entidad={entidad} registro={dialogo.registro} onClose={() => setDialogo(null)} />
      )}
    </div>
  );
}
