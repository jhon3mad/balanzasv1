import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeftIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/layout/page-header";
import { formatFechaHora } from "@/lib/dates";
import { paramId } from "@/lib/search-params";
import { requirePermission } from "@/lib/session";
import { obtenerCaja } from "@/features/caja/queries";
import { ResumenCajaView } from "@/features/caja/components/resumen-caja";

export const metadata: Metadata = { title: "Caja" };

export default async function CajaDetallePage({ params }: PageProps<"/caja/[id]">) {
  await requirePermission({ caja: ["historial"] });
  const id = paramId((await params).id);
  const caja = id ? await obtenerCaja(id) : null;
  if (!caja) notFound();

  return (
    <>
      <div>
        <Button variant="ghost" size="sm" className="-ml-2" nativeButton={false} render={<Link href="/caja/historial" />}>
          <ArrowLeftIcon />
          Historial
        </Button>
      </div>
      <PageHeader
        titulo={`Caja del ${formatFechaHora(caja.fechaApertura)}`}
        descripcion={
          caja.fechaCierre
            ? `Abrió ${caja.abiertaPor} · cerró ${caja.cerradaPor} el ${formatFechaHora(caja.fechaCierre)}`
            : `Abierta por ${caja.abiertaPor}`
        }
      />
      <ResumenCajaView caja={caja} />
    </>
  );
}
