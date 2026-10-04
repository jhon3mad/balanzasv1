import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { paramId } from "@/lib/search-params";
import { requirePermission } from "@/lib/session";
import { getConfiguracion } from "@/features/configuracion/queries";
import { obtenerVenta } from "@/features/ventas/queries";
import { BoletaDocumento } from "@/features/impresion/components/boleta-documento";
import { HojaImpresion } from "@/features/impresion/components/hoja-impresion";

export const metadata: Metadata = { title: "Imprimir boleta" };

export default async function ImprimirVentaPage({ params }: PageProps<"/imprimir/venta/[id]">) {
  const session = await requirePermission({ venta: ["ver"] });
  if (session.user.mustChangePassword) redirect("/cambiar-clave");
  const id = paramId((await params).id);
  const [venta, config] = await Promise.all([id ? obtenerVenta(id, { verCosto: false }) : null, getConfiguracion()]);
  if (!venta) notFound();

  return (
    <HojaImpresion formato={config.formatoTicket} autoImprimir>
      <BoletaDocumento venta={venta} config={config} formato={config.formatoTicket} />
    </HojaImpresion>
  );
}
