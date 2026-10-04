import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { PageHeader } from "@/components/layout/page-header";
import { rolTienePermiso } from "@/lib/permissions";
import { paramId } from "@/lib/search-params";
import { requirePermission } from "@/lib/session";
import { obtenerCompra, opcionesCompra } from "@/features/compras/queries";
import { CompraForm } from "@/features/compras/components/compra-form";

export const metadata: Metadata = { title: "Editar compra" };

export default async function EditarCompraPage({ params }: PageProps<"/compras/[id]/editar">) {
  const session = await requirePermission({ compra: ["crear"] });
  const id = paramId((await params).id);
  const compra = id ? await obtenerCompra(id) : null;
  if (!compra) notFound();
  if (compra.estado !== "PENDIENTE") redirect(`/compras/${compra.id}`);

  const { proveedores, presentaciones } = await opcionesCompra(compra.proveedorId);

  return (
    <>
      <PageHeader titulo={`Editar pedido ${compra.numero}`} descripcion={compra.proveedor} />
      <CompraForm
        compra={compra}
        proveedores={proveedores}
        presentaciones={presentaciones}
        puedeRecibir={rolTienePermiso(session.user.role, { compra: ["recibir"] })}
      />
    </>
  );
}
