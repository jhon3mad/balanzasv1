"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Spinner } from "@/components/ui/spinner";
import { PasswordInput } from "@/components/form/password-input";
import { handleActionResult } from "@/lib/notify";
import { cambiarClaveAction } from "../actions";
import { cambiarClaveSchema, type CambiarClaveInput } from "../schemas";

export function CambiarClaveForm() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const form = useForm<CambiarClaveInput>({
    resolver: zodResolver(cambiarClaveSchema),
    defaultValues: { actual: "", nueva: "", confirmar: "" },
  });
  const { errors } = form.formState;

  const onSubmit = form.handleSubmit((values) => {
    startTransition(async () => {
      const result = await cambiarClaveAction(values);
      if (handleActionResult(result, form.setError)) {
        router.replace(result.data.redirectTo);
        router.refresh();
      }
    });
  });

  return (
    <form onSubmit={onSubmit} noValidate>
      <FieldGroup>
        <Field data-invalid={!!errors.actual}>
          <FieldLabel htmlFor="actual">Contraseña actual</FieldLabel>
          <PasswordInput
            id="actual"
            autoComplete="current-password"
            autoFocus
            aria-invalid={!!errors.actual}
            {...form.register("actual")}
          />
          <FieldError errors={[errors.actual]} />
        </Field>
        <Field data-invalid={!!errors.nueva}>
          <FieldLabel htmlFor="nueva">Nueva contraseña</FieldLabel>
          <PasswordInput
            id="nueva"
            autoComplete="new-password"
            aria-invalid={!!errors.nueva}
            {...form.register("nueva")}
          />
          <FieldDescription>Mínimo 8 caracteres.</FieldDescription>
          <FieldError errors={[errors.nueva]} />
        </Field>
        <Field data-invalid={!!errors.confirmar}>
          <FieldLabel htmlFor="confirmar">Confirmar nueva contraseña</FieldLabel>
          <PasswordInput
            id="confirmar"
            autoComplete="new-password"
            aria-invalid={!!errors.confirmar}
            {...form.register("confirmar")}
          />
          <FieldError errors={[errors.confirmar]} />
        </Field>
        <Button type="submit" size="lg" className="w-full" disabled={pending}>
          {pending && <Spinner />}
          Guardar contraseña
        </Button>
      </FieldGroup>
    </form>
  );
}
