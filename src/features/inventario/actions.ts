"use server";

import { revalidatePath } from "next/cache";
import { createAction, ok } from "@/lib/safe-action";
import { ajusteSchema } from "./schemas";
import { registrarAjuste } from "./service";

export const registrarAjusteAction = createAction({
  schema: ajusteSchema,
  permission: { inventario: ["ajustar"] },
  handler: async (datos, { session }) => {
    const { id, movimientos } = await registrarAjuste(datos, session.user.id);
    revalidatePath("/inventario", "layout");
    revalidatePath("/productos", "layout");
    return ok(
      { id },
      `Ajuste registrado: ${movimientos} ${movimientos === 1 ? "producto actualizado" : "productos actualizados"}`,
    );
  },
});
