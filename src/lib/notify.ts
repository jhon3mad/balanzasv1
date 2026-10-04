"use client";

import type { FieldValues, Path, UseFormSetError } from "react-hook-form";
import { toast } from "@/components/ui/toast";
import type { ActionResult } from "@/lib/action-result";

export const notify = {
  success: (title: string, description?: string) => toast.add({ title, description, type: "success" }),
  error: (title: string, description?: string) => toast.add({ title, description, type: "error" }),
  info: (title: string, description?: string) => toast.add({ title, description, type: "info" }),
  warning: (title: string, description?: string) => toast.add({ title, description, type: "warning" }),
};

/**
 * Muestra el mensaje del resultado y, si hay errores por campo,
 * los coloca en el formulario. Devuelve true si la acción fue exitosa.
 */
export function handleActionResult<T, F extends FieldValues>(
  result: ActionResult<T>,
  setError?: UseFormSetError<F>,
): result is Extract<ActionResult<T>, { ok: true }> {
  if (result.ok) {
    notify.success(result.message);
    return true;
  }
  notify.error(result.message);
  if (setError && result.fieldErrors) {
    for (const [campo, mensajes] of Object.entries(result.fieldErrors)) {
      if (mensajes?.[0]) setError(campo as Path<F>, { type: "server", message: mensajes[0] });
    }
  }
  return false;
}
