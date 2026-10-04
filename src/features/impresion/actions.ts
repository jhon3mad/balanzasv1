"use server";

import { z } from "@/lib/validation";
import { esAccesibleDesdeInternet, urlBase } from "@/lib/enlace-publico";
import { AppError } from "@/lib/errors";
import { createAction, ok } from "@/lib/safe-action";
import { getConfiguracion } from "@/features/configuracion/queries";
import { obtenerOrden } from "@/features/ordenes/queries";
import { obtenerVenta } from "@/features/ventas/queries";
import { mensajeOrden, mensajeVenta } from "./mensajes";
import { asegurarTokenOrden, asegurarTokenVenta } from "./service";

export type MensajeWhatsapp = {
  texto: string;
  /** Celular registrado del cliente (para sugerirlo) */
  telefono: string | null;
  /** null si el sistema no está publicado en internet (el cliente no podría abrir el enlace) */
  enlace: string | null;
};

/** Enlace público solo si el sistema es accesible desde internet. */
async function enlacePublico(ruta: string, token: () => Promise<string>): Promise<string | null> {
  const base = await urlBase();
  if (!esAccesibleDesdeInternet(base)) return null;
  return `${base}${ruta}/${await token()}`;
}

export const whatsappVentaAction = createAction({
  schema: z.object({ ventaId: z.number().int().positive() }),
  permission: { venta: ["ver"] },
  handler: async ({ ventaId }) => {
    const venta = await obtenerVenta(ventaId, { verCosto: false });
    if (!venta) throw new AppError("La venta no existe.");
    if (venta.estado === "ANULADA") throw new AppError("La venta está anulada.");
    const [config, enlace] = await Promise.all([getConfiguracion(), enlacePublico("/b", () => asegurarTokenVenta(ventaId))]);
    return ok<MensajeWhatsapp>({ texto: mensajeVenta(venta, config, enlace), telefono: venta.clienteTelefono, enlace }, "Mensaje listo");
  },
});

export const whatsappOrdenAction = createAction({
  schema: z.object({ ordenId: z.number().int().positive() }),
  permission: { ordenServicio: ["ver"] },
  handler: async ({ ordenId }) => {
    const orden = await obtenerOrden(ordenId);
    if (!orden) throw new AppError("La orden de servicio no existe.");
    const [config, enlace] = await Promise.all([getConfiguracion(), enlacePublico("/o", () => asegurarTokenOrden(ordenId))]);
    return ok<MensajeWhatsapp>({ texto: mensajeOrden(orden, config, enlace), telefono: orden.clienteTelefono, enlace }, "Mensaje listo");
  },
});
