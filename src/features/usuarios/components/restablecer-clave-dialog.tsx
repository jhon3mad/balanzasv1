"use client";

import { useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { SparklesIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput } from "@/components/ui/input-group";
import { Spinner } from "@/components/ui/spinner";
import { handleActionResult } from "@/lib/notify";
import { restablecerClaveAction } from "../actions";
import { restablecerClaveSchema, type RestablecerClaveInput } from "../schemas";
import type { UsuarioDTO } from "../queries";
import { generarClaveTemporal } from "./generar-clave";

type Props = {
  usuario: UsuarioDTO;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function RestablecerClaveDialog({ usuario, open, onOpenChange }: Props) {
  const [pending, startTransition] = useTransition();
  const form = useForm<RestablecerClaveInput>({
    resolver: zodResolver(restablecerClaveSchema),
    values: { id: usuario.id, password: "" },
  });
  const { errors } = form.formState;

  const onSubmit = form.handleSubmit((values) => {
    startTransition(async () => {
      const result = await restablecerClaveAction(values);
      if (handleActionResult(result, form.setError)) onOpenChange(false);
    });
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={onSubmit} noValidate className="grid gap-4">
          <DialogHeader>
            <DialogTitle>Restablecer contraseña</DialogTitle>
            <DialogDescription>
              {usuario.name} (@{usuario.username}). Se cerrarán sus sesiones abiertas y deberá cambiar la
              contraseña al ingresar.
            </DialogDescription>
          </DialogHeader>
          <FieldGroup>
            <Field data-invalid={!!errors.password}>
              <FieldLabel htmlFor="reset-password">Nueva contraseña temporal</FieldLabel>
              <InputGroup>
                <InputGroupInput
                  id="reset-password"
                  autoComplete="new-password"
                  autoFocus
                  aria-invalid={!!errors.password}
                  {...form.register("password")}
                />
                <InputGroupAddon align="inline-end">
                  <InputGroupButton
                    onClick={() => form.setValue("password", generarClaveTemporal(), { shouldValidate: true })}
                  >
                    <SparklesIcon />
                    Generar
                  </InputGroupButton>
                </InputGroupAddon>
              </InputGroup>
              <FieldDescription>Anótala y entrégasela al usuario.</FieldDescription>
              <FieldError errors={[errors.password]} />
            </Field>
          </FieldGroup>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={pending}>
              Cancelar
            </Button>
            <Button type="submit" disabled={pending}>
              {pending && <Spinner />}
              Restablecer
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
