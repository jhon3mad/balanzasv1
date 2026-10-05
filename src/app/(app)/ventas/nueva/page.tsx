import type { Metadata } from "next";
import Link from "next/link";
import { WalletIcon } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { PageHeader } from "@/components/layout/page-header";
import { hayCajaAbierta } from "@/features/caja/queries";
import { rolTienePermiso } from "@/lib/permissions";
import { requirePermission } from "@/lib/session";
import { datosPuntoVenta } from "@/features/ventas/queries";
import { PuntoVenta } from "@/features/ventas/components/punto-venta";

export const metadata: Metadata = { title: "Punto de venta" };

export default async function PuntoVentaPage() {
  const session = await requirePermission({ venta: ["crear"] });
  const rol = session.user.role;
  const usaCaja = rolTienePermiso(rol, { caja: ["operar"] });
  const [{ productos, clientes, metodos }, cajaAbierta] = await Promise.all([
    datosPuntoVenta(),
    usaCaja ? hayCajaAbierta() : Promise.resolve(true),
  ]);

  return (
    <>
      <PageHeader titulo="Punto de venta" />
      {!cajaAbierta && (
        <Alert>
          <WalletIcon />
          <AlertTitle>La caja está cerrada</AlertTitle>
          <AlertDescription>
            Puedes vender igual, pero el efectivo de estas ventas no entrará en ningún arqueo.{" "}
            <Link href="/caja/actual" className="font-medium underline underline-offset-2">
              Abrir caja
            </Link>
          </AlertDescription>
        </Alert>
      )}
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
