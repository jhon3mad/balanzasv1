import type { Metadata } from "next";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/layout/page-header";
import { formatFechaHora } from "@/lib/dates";
import { formatPEN } from "@/lib/money";
import { requirePermission } from "@/lib/session";
import { cajaAbierta, ultimoCierre } from "@/features/caja/queries";
import { AbrirCajaForm } from "@/features/caja/components/abrir-caja-form";
import { CajaAcciones } from "@/features/caja/components/caja-acciones";
import { ResumenCajaView } from "@/features/caja/components/resumen-caja";

export const metadata: Metadata = { title: "Caja" };

export default async function CajaActualPage() {
  await requirePermission({ caja: ["operar"] });
  const caja = await cajaAbierta();

  if (!caja) {
    return (
      <>
        <PageHeader titulo="Caja" descripcion="Apertura, ingresos, retiros y cierre con arqueo del efectivo." />
        <AbrirCajaForm ultimoCierre={await ultimoCierre()} />
      </>
    );
  }

  return (
    <>
      <PageHeader titulo="Caja abierta" descripcion={`Desde ${formatFechaHora(caja.fechaApertura)} · abrió ${caja.abiertaPor}`}>
        <CajaAcciones esperado={caja.resumen.esperado} />
      </PageHeader>

      <Card className="sm:max-w-sm">
        <CardContent>
          <div className="text-sm text-muted-foreground">Efectivo que debería haber en caja</div>
          <div className="text-5xl font-semibold tracking-tight">{formatPEN(caja.resumen.esperado)}</div>
          <div className="mt-1 text-xs text-muted-foreground">Total cobrado en el turno: {formatPEN(caja.resumen.totalNeto)}</div>
        </CardContent>
      </Card>

      <ResumenCajaView caja={caja} />
    </>
  );
}
