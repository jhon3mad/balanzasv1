import type { Metadata } from "next";
import { requirePermission } from "@/lib/session";
import { listarCatalogoSimple } from "@/features/catalogos/queries";
import { CatalogoSimpleTable } from "@/features/catalogos/components/catalogo-simple-table";

export const metadata: Metadata = { title: "Formas de balanza" };

export default async function FormasPage() {
  await requirePermission({ catalogo: ["gestionar"] });
  return <CatalogoSimpleTable entidad="forma" items={await listarCatalogoSimple("forma")} />;
}
