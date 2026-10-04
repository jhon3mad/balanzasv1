import { TabsNav } from "@/components/layout/tabs-nav";
import { rolTienePermiso } from "@/lib/permissions";
import { requirePermission } from "@/lib/session";

export default async function InventarioLayout({ children }: { children: React.ReactNode }) {
  const session = await requirePermission({ inventario: ["ver"] });
  const rol = session.user.role;
  const tabs = [
    { href: "/inventario/stock", titulo: "Stock" },
    ...(rolTienePermiso(rol, { inventario: ["verKardex"] }) ? [{ href: "/inventario/kardex", titulo: "Kardex" }] : []),
    ...(rolTienePermiso(rol, { inventario: ["ajustar"] }) ? [{ href: "/inventario/ajustes", titulo: "Ajustes" }] : []),
  ];

  return (
    <>
      {tabs.length > 1 && <TabsNav tabs={tabs} />}
      {children}
    </>
  );
}
