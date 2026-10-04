"use client";

import { useState, useTransition } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { PlusIcon, SparklesIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput } from "@/components/ui/input-group";
import { Spinner } from "@/components/ui/spinner";
import { handleActionResult } from "@/lib/notify";
import { crearUsuarioAction } from "../actions";
import { crearUsuarioSchema, type CrearUsuarioInput } from "../schemas";
import { generarClaveTemporal } from "./generar-clave";
import { RolSelect } from "./rol-select";

const VALORES_INICIALES: CrearUsuarioInput = { name: "", username: "", role: "vendedor", password: "" };

export function CrearUsuarioDialog() {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const form = useForm<CrearUsuarioInput>({
    resolver: zodResolver(crearUsuarioSchema),
    defaultValues: VALORES_INICIALES,
  });
  const { errors } = form.formState;

  const onSubmit = form.handleSubmit((values) => {
    startTransition(async () => {
      const result = await crearUsuarioAction(values);
      if (handleActionResult(result, form.setError)) {
        form.reset(VALORES_INICIALES);
        setOpen(false);
      }
    });
  });

  return (
    <Dialog
      open={open}
      onOpenChange={(abierto) => {
        setOpen(abierto);
        if (!abierto) form.reset(VALORES_INICIALES);
      }}
    >
      <DialogTrigger render={<Button />}>
        <PlusIcon />
        Nuevo usuario
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={onSubmit} noValidate className="grid gap-4">
          <DialogHeader>
            <DialogTitle>Nuevo usuario</DialogTitle>
            <DialogDescription>
              Entrega al usuario su contraseña temporal; deberá cambiarla en su primer ingreso.
            </DialogDescription>
          </DialogHeader>
          <FieldGroup>
            <Field data-invalid={!!errors.name}>
              <FieldLabel htmlFor="crear-name">Nombre completo</FieldLabel>
              <Input id="crear-name" autoFocus aria-invalid={!!errors.name} {...form.register("name")} />
              <FieldError errors={[errors.name]} />
            </Field>
            <Field data-invalid={!!errors.username}>
              <FieldLabel htmlFor="crear-username">Usuario</FieldLabel>
              <Input
                id="crear-username"
                autoComplete="off"
                autoCapitalize="none"
                placeholder="ej. jperez"
                aria-invalid={!!errors.username}
                {...form.register("username")}
              />
              <FieldDescription>Con este nombre iniciará sesión. Solo minúsculas, números, punto y guion bajo.</FieldDescription>
              <FieldError errors={[errors.username]} />
            </Field>
            <Field data-invalid={!!errors.role}>
              <FieldLabel htmlFor="crear-role">Rol</FieldLabel>
              <Controller
                control={form.control}
                name="role"
                render={({ field }) => (
                  <RolSelect id="crear-role" value={field.value} onChange={field.onChange} invalid={!!errors.role} />
                )}
              />
              <FieldError errors={[errors.role]} />
            </Field>
            <Field data-invalid={!!errors.password}>
              <FieldLabel htmlFor="crear-password">Contraseña temporal</FieldLabel>
              <InputGroup>
                <InputGroupInput
                  id="crear-password"
                  autoComplete="new-password"
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
              <FieldError errors={[errors.password]} />
            </Field>
          </FieldGroup>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={pending}>
              Cancelar
            </Button>
            <Button type="submit" disabled={pending}>
              {pending && <Spinner />}
              Crear usuario
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
