import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { PageHeader } from "@/components/layout/page-header";
import { rolTienePermiso } from "@/lib/permissions";
import { paramId } from "@/lib/search-params";
import { requirePermission } from "@/lib/session";
import { opcionesClientesVenta } from "@/features/ventas/queries";
import { esFinal } from "@/features/ordenes/constants";
import { obtenerOrden, opcionesTecnicos, sugerenciasMarcas } from "@/features/ordenes/queries";
import { OrdenForm } from "@/features/ordenes/components/orden-form";

export const metadata: Metadata = { title: "Editar orden de servicio" };

export default async function EditarOrdenPage({ params }: PageProps<"/servicios/[id]/editar">) {
  const session = await requirePermission({ ordenServicio: ["actualizar"] });
  const id = paramId((await params).id);
  const orden = id ? await obtenerOrden(id) : null;
  if (!orden) notFound();
  if (esFinal(orden.estado)) redirect(`/servicios/${orden.id}`);

  const [clientes, tecnicos, marcas] = await Promise.all([
    opcionesClientesVenta(),
    opcionesTecnicos(orden.tecnicoId),
    sugerenciasMarcas(),
  ]);

  return (
    <>
      <PageHeader titulo={`Editar orden ${orden.numero}`} descripcion={orden.cliente} />
      <OrdenForm
        orden={orden}
        clientes={clientes}
        tecnicos={tecnicos}
        marcas={marcas}
        puedeCrearCliente={rolTienePermiso(session.user.role, { cliente: ["gestionar"] })}
      />
    </>
  );
}
