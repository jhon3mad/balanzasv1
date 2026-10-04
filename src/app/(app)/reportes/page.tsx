import { redirect } from "next/navigation";
import { requireSession } from "@/lib/session";
import { alcanceReportes, pestanasReportes } from "@/features/reportes/permisos";

/** /reportes abre la primera pestaña que el rol puede ver. */
export default async function ReportesPage() {
  const session = await requireSession();
  const [primera] = pestanasReportes(alcanceReportes(session.user.role));
  redirect(primera?.href ?? "/sin-permiso");
}
