import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/layout/page-header";
import { rolTienePermiso } from "@/lib/permissions";
import { paramId } from "@/lib/search-params";
import { requirePermission } from "@/lib/session";
import { obtenerProducto, opcionesProducto } from "@/features/productos/queries";
import { ProductoForm } from "@/features/productos/components/producto-form";

export const metadata: Metadata = { title: "Editar producto" };

export default async function EditarProductoPage({ params }: PageProps<"/productos/[id]/editar">) {
  const session = await requirePermission({ producto: ["editar"] });
  const id = paramId((await params).id);
  const producto = id ? await obtenerProducto(id, { verCosto: false }) : null;
  if (!producto) notFound();

  const opciones = await opcionesProducto({
    marcaId: producto.marcaId,
    usoId: producto.usoId,
    formaId: producto.formaId,
  });

  return (
    <>
      <PageHeader titulo="Editar producto" descripcion={producto.nombre} />
      <ProductoForm
        producto={producto}
        opciones={opciones}
        puedeStockInicial={rolTienePermiso(session.user.role, { inventario: ["ajustar"] })}
      />
    </>
  );
}
