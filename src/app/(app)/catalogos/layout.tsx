import { PageHeader } from "@/components/layout/page-header";
import { TabsNav } from "@/components/layout/tabs-nav";
import { requirePermission } from "@/lib/session";

const TABS = [
  { href: "/catalogos/marcas", titulo: "Marcas" },
  { href: "/catalogos/usos", titulo: "Usos de balanza" },
  { href: "/catalogos/formas", titulo: "Formas de balanza" },
  { href: "/catalogos/servicios", titulo: "Servicios" },
  { href: "/catalogos/metodos-pago", titulo: "Métodos de pago" },
];

export default async function CatalogosLayout({ children }: { children: React.ReactNode }) {
  await requirePermission({ catalogo: ["gestionar"] });
  return (
    <>
      <PageHeader titulo="Catálogos" descripcion="Listas que se usan al registrar productos, servicios y pagos." />
      <div className="grid max-w-4xl gap-4">
        <TabsNav tabs={TABS} />
        {children}
      </div>
    </>
  );
}
