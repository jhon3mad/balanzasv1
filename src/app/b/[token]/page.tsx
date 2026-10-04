import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getConfiguracion } from "@/features/configuracion/queries";
import { ventaPublica } from "@/features/impresion/queries";
import { BoletaDocumento } from "@/features/impresion/components/boleta-documento";
import { HojaImpresion } from "@/features/impresion/components/hoja-impresion";

// Página pública (sin sesión): se llega por el enlace enviado por WhatsApp.
export const metadata: Metadata = { title: "Boleta", robots: { index: false, follow: false } };

export default async function BoletaPublicaPage({ params }: PageProps<"/b/[token]">) {
  const { token } = await params;
  const [venta, config] = await Promise.all([ventaPublica(token), getConfiguracion()]);
  if (!venta) notFound();

  return (
    <HojaImpresion
      formato={config.formatoTicket}
      textoBoton="Descargar PDF / imprimir"
      encabezado={
        <p className="text-sm text-neutral-600">
          Para guardarla en PDF, elige <strong>«Guardar como PDF»</strong> en la ventana que se abre.
        </p>
      }
    >
      <BoletaDocumento venta={venta} config={config} formato={config.formatoTicket} />
    </HojaImpresion>
  );
}
