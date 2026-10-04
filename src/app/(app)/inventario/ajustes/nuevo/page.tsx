import type { Metadata } from "next";
import { PageHeader } from "@/components/layout/page-header";
import { requirePermission } from "@/lib/session";
import { presentacionesParaAjuste } from "@/features/inventario/queries";
import { AjusteForm } from "@/features/inventario/components/ajuste-form";

export const metadata: Metadata = { title: "Nuevo ajuste" };

export default async function NuevoAjustePage() {
  await requirePermission({ inventario: ["ajustar"] });
  const presentaciones = await presentacionesParaAjuste();

  return (
    <>
      <PageHeader titulo="Nuevo ajuste de inventario" descripcion="El stock se actualiza al registrar y queda en el kardex." />
      <AjusteForm presentaciones={presentaciones} />
    </>
  );
}
