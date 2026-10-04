import type { Metadata } from "next";
import { PageHeader } from "@/components/layout/page-header";
import { rolTienePermiso } from "@/lib/permissions";
import { requirePermission } from "@/lib/session";
import { opcionesCompra } from "@/features/compras/queries";
import { CompraForm } from "@/features/compras/components/compra-form";

export const metadata: Metadata = { title: "Nueva compra" };

export default async function NuevaCompraPage() {
  const session = await requirePermission({ compra: ["crear"] });
  const { proveedores, presentaciones } = await opcionesCompra();

  return (
    <>
      <PageHeader titulo="Nueva compra" descripcion="Registra el pedido a tu proveedor." />
      <CompraForm
        proveedores={proveedores}
        presentaciones={presentaciones}
        puedeRecibir={rolTienePermiso(session.user.role, { compra: ["recibir"] })}
      />
    </>
  );
}
