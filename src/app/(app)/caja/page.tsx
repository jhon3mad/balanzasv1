import { redirect } from "next/navigation";
import { rolTienePermiso } from "@/lib/permissions";
import { requireSession } from "@/lib/session";

/** /caja abre la caja actual (o el historial para quien solo lo puede ver). */
export default async function CajaPage() {
  const session = await requireSession();
  redirect(rolTienePermiso(session.user.role, { caja: ["operar"] }) ? "/caja/actual" : "/caja/historial");
}
