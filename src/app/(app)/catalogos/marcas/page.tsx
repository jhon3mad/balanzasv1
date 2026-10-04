import type { Metadata } from "next";
import { requirePermission } from "@/lib/session";
import { listarCatalogoSimple } from "@/features/catalogos/queries";
import { CatalogoSimpleTable } from "@/features/catalogos/components/catalogo-simple-table";

export const metadata: Metadata = { title: "Marcas" };

export default async function MarcasPage() {
  await requirePermission({ catalogo: ["gestionar"] });
  return <CatalogoSimpleTable entidad="marca" items={await listarCatalogoSimple("marca")} />;
}
