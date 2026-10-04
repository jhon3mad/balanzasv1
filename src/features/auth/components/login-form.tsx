"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { PasswordInput } from "@/components/form/password-input";
import { handleActionResult } from "@/lib/notify";
import { loginAction } from "../actions";
import { loginSchema, type LoginInput } from "../schemas";

export function LoginForm({ redirect }: { redirect?: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const form = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { username: "", password: "", redirect },
  });
  const { errors } = form.formState;

  const onSubmit = form.handleSubmit((values) => {
    startTransition(async () => {
      const result = await loginAction(values);
      if (handleActionResult(result, form.setError)) {
        router.replace(result.data.redirectTo);
        router.refresh();
      } else {
        form.resetField("password");
      }
    });
  });

  return (
    <form onSubmit={onSubmit} noValidate>
      <FieldGroup>
        <Field data-invalid={!!errors.username}>
          <FieldLabel htmlFor="username">Usuario</FieldLabel>
          <Input
            id="username"
            autoComplete="username"
            autoCapitalize="none"
            autoFocus
            aria-invalid={!!errors.username}
            {...form.register("username")}
          />
          <FieldError errors={[errors.username]} />
        </Field>
        <Field data-invalid={!!errors.password}>
          <FieldLabel htmlFor="password">Contraseña</FieldLabel>
          <PasswordInput
            id="password"
            autoComplete="current-password"
            aria-invalid={!!errors.password}
            {...form.register("password")}
          />
          <FieldError errors={[errors.password]} />
        </Field>
        <Button type="submit" size="lg" className="w-full" disabled={pending}>
          {pending && <Spinner />}
          Ingresar
        </Button>
      </FieldGroup>
    </form>
  );
}
