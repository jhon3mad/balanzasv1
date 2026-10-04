import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getConfiguracion } from "@/features/configuracion/queries";
import { ordenPublica } from "@/features/impresion/queries";
import { HojaImpresion } from "@/features/impresion/components/hoja-impresion";
import { TicketOrden } from "@/features/impresion/components/ticket-orden";

// Página pública (sin sesión): el cliente consulta el estado de su equipo.
export const metadata: Metadata = { title: "Orden de servicio", robots: { index: false, follow: false } };

export default async function OrdenPublicaPage({ params }: PageProps<"/o/[token]">) {
  const { token } = await params;
  const [orden, config] = await Promise.all([ordenPublica(token), getConfiguracion()]);
  if (!orden) notFound();

  return (
    <HojaImpresion formato={config.formatoTicket} textoBoton="Descargar PDF / imprimir">
      <TicketOrden orden={orden} config={config} formato={config.formatoTicket} consulta />
    </HojaImpresion>
  );
}
