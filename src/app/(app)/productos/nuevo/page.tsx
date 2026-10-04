import type { Metadata } from "next";
import { PageHeader } from "@/components/layout/page-header";
import { rolTienePermiso } from "@/lib/permissions";
import { requirePermission } from "@/lib/session";
import { opcionesProducto } from "@/features/productos/queries";
import { ProductoForm } from "@/features/productos/components/producto-form";

export const metadata: Metadata = { title: "Nuevo producto" };

export default async function NuevoProductoPage() {
  const session = await requirePermission({ producto: ["crear"] });
  const opciones = await opcionesProducto();

  return (
    <>
      <PageHeader titulo="Nuevo producto" descripcion="Registra el producto y sus presentaciones." />
      <ProductoForm
        opciones={opciones}
        puedeStockInicial={rolTienePermiso(session.user.role, { inventario: ["ajustar"] })}
      />
    </>
  );
}
