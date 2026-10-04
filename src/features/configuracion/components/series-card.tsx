"use client";

import { useTransition } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { SaveIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldError } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { handleActionResult } from "@/lib/notify";
import { guardarSerieAction } from "../actions";
import { serieSchema, type SerieInput } from "../schemas";

export type SerieDTO = { id: number; tipo: "BOLETA" | "ORDEN_SERVICIO" | "COMPRA"; serie: string; ultimoNumero: number };

const TIPO_LABELS: Record<SerieDTO["tipo"], string> = {
  BOLETA: "Comprobante de venta",
  ORDEN_SERVICIO: "Orden de servicio",
  COMPRA: "Orden de compra",
};

function SerieFila({ serie }: { serie: SerieDTO }) {
  const [pending, startTransition] = useTransition();
  const form = useForm<SerieInput>({
    resolver: zodResolver(serieSchema),
    values: { id: serie.id, serie: serie.serie, ultimoNumero: serie.ultimoNumero },
  });
  const { errors, isDirty } = form.formState;
  const [codigo, ultimo] = useWatch({ control: form.control, name: ["serie", "ultimoNumero"] });
  const siguiente = Number.isFinite(ultimo) ? `${codigo.toUpperCase()}-${String(ultimo + 1).padStart(8, "0")}` : "—";

  const onSubmit = form.handleSubmit((values) => {
    startTransition(async () => {
      const result = await guardarSerieAction(values);
      handleActionResult(result, form.setError);
    });
  });

  return (
    <form onSubmit={onSubmit} noValidate className="grid items-start gap-3 border-b py-4 last:border-b-0 sm:grid-cols-[1fr_7rem_9rem_auto]">
      <div className="space-y-0.5 pt-1">
        <p className="text-sm font-medium">{TIPO_LABELS[serie.tipo]}</p>
        <p className="text-xs text-muted-foreground">Siguiente: {siguiente}</p>
      </div>
      <Field data-invalid={!!errors.serie}>
        <Input
          aria-label="Serie"
          maxLength={4}
          className="uppercase"
          aria-invalid={!!errors.serie}
          {...form.register("serie")}
        />
        <FieldError errors={[errors.serie]} />
      </Field>
      <Field data-invalid={!!errors.ultimoNumero}>
        <Input
          aria-label="Último número emitido"
          type="number"
          min={0}
          aria-invalid={!!errors.ultimoNumero}
          {...form.register("ultimoNumero", { valueAsNumber: true })}
        />
        <FieldError errors={[errors.ultimoNumero]} />
      </Field>
      <Button type="submit" variant="outline" disabled={!isDirty || pending}>
        {pending ? <Spinner /> : <SaveIcon />}
        Guardar
      </Button>
    </form>
  );
}

export function SeriesCard({ series }: { series: SerieDTO[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Series y correlativos</CardTitle>
        <CardDescription>
          Si ya usabas un talonario, coloca el último número emitido para continuar la numeración. El correlativo lo
          asigna la base de datos al emitir cada documento.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="hidden gap-3 pb-1 text-xs font-medium text-muted-foreground sm:grid sm:grid-cols-[1fr_7rem_9rem_auto]">
          <span>Documento</span>
          <span>Serie</span>
          <span>Último número</span>
          <span className="w-24" />
        </div>
        {series.map((s) => (
          <SerieFila key={s.id} serie={s} />
        ))}
      </CardContent>
    </Card>
  );
}
