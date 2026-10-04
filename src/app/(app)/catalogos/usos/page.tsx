import type { Metadata } from "next";
import { requirePermission } from "@/lib/session";
import { listarCatalogoSimple } from "@/features/catalogos/queries";
import { CatalogoSimpleTable } from "@/features/catalogos/components/catalogo-simple-table";

export const metadata: Metadata = { title: "Usos de balanza" };

export default async function UsosPage() {
  await requirePermission({ catalogo: ["gestionar"] });
  return <CatalogoSimpleTable entidad="uso" items={await listarCatalogoSimple("uso")} />;
}
