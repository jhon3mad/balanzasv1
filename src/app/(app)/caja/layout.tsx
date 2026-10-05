import { redirect } from "next/navigation";
import { TabsNav } from "@/components/layout/tabs-nav";
import { rolTienePermiso } from "@/lib/permissions";
import { requireSession } from "@/lib/session";

export default async function CajaLayout({ children }: { children: React.ReactNode }) {
  const session = await requireSession();
  const rol = session.user.role;
  const operar = rolTienePermiso(rol, { caja: ["operar"] });
  const historial = rolTienePermiso(rol, { caja: ["historial"] });
  if (!operar && !historial) redirect("/sin-permiso");
  const tabs = [
    ...(operar ? [{ href: "/caja/actual", titulo: "Caja actual" }] : []),
    ...(historial ? [{ href: "/caja/historial", titulo: "Historial" }] : []),
  ];

  return (
    <>
      {tabs.length > 1 && <TabsNav tabs={tabs} />}
      {children}
    </>
  );
}
