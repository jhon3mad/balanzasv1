import type { Metadata } from "next";
import { PageHeader } from "@/components/layout/page-header";
import { rolTienePermiso } from "@/lib/permissions";
import { requirePermission } from "@/lib/session";
import { opcionesClientesVenta } from "@/features/ventas/queries";
import { opcionesTecnicos, sugerenciasMarcas } from "@/features/ordenes/queries";
import { OrdenForm } from "@/features/ordenes/components/orden-form";

export const metadata: Metadata = { title: "Recibir equipo" };

export default async function NuevaOrdenPage() {
  const session = await requirePermission({ ordenServicio: ["crear"] });
  const [clientes, tecnicos, marcas] = await Promise.all([opcionesClientesVenta(), opcionesTecnicos(), sugerenciasMarcas()]);

  return (
    <>
      <PageHeader titulo="Recibir equipo" descripcion="Registra la orden de servicio con los datos del equipo y la falla." />
      <OrdenForm
        clientes={clientes}
        tecnicos={tecnicos}
        marcas={marcas}
        puedeCrearCliente={rolTienePermiso(session.user.role, { cliente: ["gestionar"] })}
      />
    </>
  );
}
