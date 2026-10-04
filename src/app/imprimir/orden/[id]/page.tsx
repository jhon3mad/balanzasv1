import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { paramId } from "@/lib/search-params";
import { requirePermission } from "@/lib/session";
import { getConfiguracion } from "@/features/configuracion/queries";
import { obtenerOrden } from "@/features/ordenes/queries";
import { HojaImpresion } from "@/features/impresion/components/hoja-impresion";
import { TicketOrden } from "@/features/impresion/components/ticket-orden";

export const metadata: Metadata = { title: "Ticket de recepción" };

export default async function ImprimirOrdenPage({ params }: PageProps<"/imprimir/orden/[id]">) {
  const session = await requirePermission({ ordenServicio: ["ver"] });
  if (session.user.mustChangePassword) redirect("/cambiar-clave");
  const id = paramId((await params).id);
  const [orden, config] = await Promise.all([id ? obtenerOrden(id) : null, getConfiguracion()]);
  if (!orden) notFound();

  return (
    <HojaImpresion formato={config.formatoTicket} autoImprimir>
      <TicketOrden orden={orden} config={config} formato={config.formatoTicket} />
    </HojaImpresion>
  );
}
