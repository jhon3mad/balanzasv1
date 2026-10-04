import type { Metadata } from "next";
import { PageHeader } from "@/components/layout/page-header";
import { rolTienePermiso } from "@/lib/permissions";
import { requirePermission } from "@/lib/session";
import { datosPuntoVenta } from "@/features/ventas/queries";
import { PuntoVenta } from "@/features/ventas/components/punto-venta";

export const metadata: Metadata = { title: "Punto de venta" };

export default async function PuntoVentaPage() {
  const session = await requirePermission({ venta: ["crear"] });
  const rol = session.user.role;
  const { productos, clientes, metodos } = await datosPuntoVenta();

  return (
    <>
      <PageHeader titulo="Punto de venta" />
      <PuntoVenta
        productos={productos}
        clientes={clientes}
        metodos={metodos}
        puedeBajoMinimo={rolTienePermiso(rol, { venta: ["precioBajoMinimo"] })}
        puedeCrearCliente={rolTienePermiso(rol, { cliente: ["gestionar"] })}
      />
    </>
  );
}
