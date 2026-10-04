import type { Metadata } from "next";
import { requirePermission } from "@/lib/session";
import { listarServicios } from "@/features/catalogos/queries";
import { ServiciosTable } from "@/features/catalogos/components/servicios-table";

export const metadata: Metadata = { title: "Servicios" };

export default async function ServiciosCatalogoPage() {
  await requirePermission({ catalogo: ["gestionar"] });
  return <ServiciosTable items={await listarServicios()} />;
}
