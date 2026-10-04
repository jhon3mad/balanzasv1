import type { Metadata } from "next";
import { PageHeader } from "@/components/layout/page-header";
import { requirePermission } from "@/lib/session";
import { getConfiguracion, getSeries } from "@/features/configuracion/queries";
import { ConfiguracionForm } from "@/features/configuracion/components/configuracion-form";
import { SeriesCard } from "@/features/configuracion/components/series-card";

export const metadata: Metadata = { title: "Configuración" };

export default async function ConfiguracionPage() {
  await requirePermission({ configuracion: ["editar"] });
  const [config, series] = await Promise.all([getConfiguracion(), getSeries()]);

  return (
    <>
      <PageHeader titulo="Configuración" descripcion="Datos de la tienda, comprobantes y correlativos." />
      <div className="grid max-w-4xl gap-6">
        <ConfiguracionForm
          valores={{
            nombreComercial: config.nombreComercial,
            razonSocial: config.razonSocial ?? "",
            ruc: config.ruc ?? "",
            direccion: config.direccion ?? "",
            telefono: config.telefono ?? "",
            email: config.email ?? "",
            logoUrl: config.logoUrl ?? "",
            tituloComprobante: config.tituloComprobante,
            piePagina: config.piePagina ?? "",
            formatoTicket: config.formatoTicket,
          }}
        />
        <SeriesCard
          series={series.map((s) => ({ id: s.id, tipo: s.tipo, serie: s.serie, ultimoNumero: s.ultimoNumero }))}
        />
      </div>
    </>
  );
}
