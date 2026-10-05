"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { LockOpenIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field";
import { Spinner } from "@/components/ui/spinner";
import { MoneyInput } from "@/components/form/money-input";
import { formatFechaHora } from "@/lib/dates";
import { formatPEN } from "@/lib/money";
import { handleActionResult } from "@/lib/notify";
import { abrirCajaAction } from "../actions";

type Props = { ultimoCierre: { efectivoContado: string; fechaCierre: string } | null };

/** Apertura del turno: el fondo con el que empieza la caja (sencillo para dar vuelto). */
export function AbrirCajaForm({ ultimoCierre }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [monto, setMonto] = useState("");
  const [error, setError] = useState<string>();

  const abrir = () => {
    startTransition(async () => {
      const result = await abrirCajaAction({ montoInicial: monto });
      if (handleActionResult(result)) router.refresh();
      else setError(result.fieldErrors?.montoInicial?.[0]);
    });
  };

  return (
    <Card className="max-w-md">
      <CardHeader>
        <CardTitle>La caja está cerrada</CardTitle>
        <CardDescription>Ábrela al empezar el día con el efectivo que hay para dar vuelto.</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">
        <Field data-invalid={!!error}>
          <FieldLabel htmlFor="montoInicial">Fondo inicial</FieldLabel>
          <MoneyInput
            id="montoInicial"
            autoFocus
            value={monto}
            aria-invalid={!!error}
            onChange={(e) => {
              setMonto(e.target.value);
              setError(undefined);
            }}
            onKeyDown={(e) => e.key === "Enter" && abrir()}
          />
          {ultimoCierre && (
            <FieldDescription>
              En el último cierre ({formatFechaHora(ultimoCierre.fechaCierre)}) se contaron {formatPEN(ultimoCierre.efectivoContado)}.{" "}
              <button type="button" className="underline underline-offset-2" onClick={() => setMonto(ultimoCierre.efectivoContado)}>
                Usar ese monto
              </button>
            </FieldDescription>
          )}
          <FieldError>{error}</FieldError>
        </Field>
        <Button onClick={abrir} disabled={pending}>
          {pending ? <Spinner /> : <LockOpenIcon />}
          Abrir caja
        </Button>
      </CardContent>
    </Card>
  );
}
