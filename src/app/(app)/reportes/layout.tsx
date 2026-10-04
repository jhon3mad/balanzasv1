import { redirect } from "next/navigation";
import { PageHeader } from "@/components/layout/page-header";
import { TabsNav } from "@/components/layout/tabs-nav";
import { requireSession } from "@/lib/session";
import { alcanceReportes, pestanasReportes } from "@/features/reportes/permisos";

export default async function ReportesLayout({ children }: { children: React.ReactNode }) {
  const session = await requireSession();
  const tabs = pestanasReportes(alcanceReportes(session.user.role));
  if (tabs.length === 0) redirect("/sin-permiso");

  return (
    <>
      <PageHeader titulo="Reportes" descripcion="Ventas, productos, compras e inventario por periodo." />
      {tabs.length > 1 && <TabsNav tabs={tabs} />}
      {children}
    </>
  );
}
