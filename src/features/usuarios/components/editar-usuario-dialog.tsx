"use client";

import { useTransition } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { isRol } from "@/lib/permissions";
import { handleActionResult } from "@/lib/notify";
import { editarUsuarioAction } from "../actions";
import { editarUsuarioSchema, type EditarUsuarioInput } from "../schemas";
import type { UsuarioDTO } from "../queries";
import { RolSelect } from "./rol-select";

type Props = {
  usuario: UsuarioDTO;
  esUsuarioActual: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function EditarUsuarioDialog({ usuario, esUsuarioActual, open, onOpenChange }: Props) {
  const [pending, startTransition] = useTransition();
  const form = useForm<EditarUsuarioInput>({
    resolver: zodResolver(editarUsuarioSchema),
    values: {
      id: usuario.id,
      name: usuario.name,
      role: isRol(usuario.role) ? usuario.role : "vendedor",
    },
  });
  const { errors } = form.formState;

  const onSubmit = form.handleSubmit((values) => {
    startTransition(async () => {
      const result = await editarUsuarioAction(values);
      if (handleActionResult(result, form.setError)) onOpenChange(false);
    });
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={onSubmit} noValidate className="grid gap-4">
          <DialogHeader>
            <DialogTitle>Editar usuario</DialogTitle>
            <DialogDescription>@{usuario.username}</DialogDescription>
          </DialogHeader>
          <FieldGroup>
            <Field data-invalid={!!errors.name}>
              <FieldLabel htmlFor="editar-name">Nombre completo</FieldLabel>
              <Input id="editar-name" aria-invalid={!!errors.name} {...form.register("name")} />
              <FieldError errors={[errors.name]} />
            </Field>
            <Field data-invalid={!!errors.role}>
              <FieldLabel htmlFor="editar-role">Rol</FieldLabel>
              <Controller
                control={form.control}
                name="role"
                render={({ field }) => (
                  <RolSelect
                    id="editar-role"
                    value={field.value}
                    onChange={field.onChange}
                    invalid={!!errors.role}
                    disabled={esUsuarioActual}
                  />
                )}
              />
              {esUsuarioActual && <FieldDescription>No puedes cambiar tu propio rol.</FieldDescription>}
              <FieldError errors={[errors.role]} />
            </Field>
          </FieldGroup>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={pending}>
              Cancelar
            </Button>
            <Button type="submit" disabled={pending}>
              {pending && <Spinner />}
              Guardar cambios
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
