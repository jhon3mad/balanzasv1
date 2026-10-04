import type { Metadata } from "next";
import { requirePermission } from "@/lib/session";
import { listarMetodosPago } from "@/features/catalogos/queries";
import { MetodosPagoTable } from "@/features/catalogos/components/metodos-pago-table";

export const metadata: Metadata = { title: "Métodos de pago" };

export default async function MetodosPagoPage() {
  await requirePermission({ catalogo: ["gestionar"] });
  return <MetodosPagoTable items={await listarMetodosPago()} />;
}
