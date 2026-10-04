import type { Metadata } from "next";
import { PageHeader } from "@/components/layout/page-header";
import { FilterSelect } from "@/components/data/filter-select";
import { PaginationBar } from "@/components/data/pagination-bar";
import { SearchInput } from "@/components/data/search-input";
import { rolTienePermiso } from "@/lib/permissions";
import { paramEnum, paramPagina, paramTexto } from "@/lib/search-params";
import { requirePermission } from "@/lib/session";
import { ESTADOS_PROVEEDOR } from "@/features/proveedores/schemas";
import { listarProveedores } from "@/features/proveedores/queries";
import { NuevoProveedorButton, ProveedoresTable } from "@/features/proveedores/components/proveedores-table";

export const metadata: Metadata = { title: "Proveedores" };

const OPCIONES_ESTADO = [
  { value: "inactivos", label: "Inactivos" },
  { value: "todos", label: "Todos" },
];

export default async function ProveedoresPage({ searchParams }: PageProps<"/proveedores">) {
  const session = await requirePermission({ proveedor: ["ver"] });
  const sp = await searchParams;
  const resultado = await listarProveedores({
    q: paramTexto(sp.q),
    estado: paramEnum(sp.estado, ESTADOS_PROVEEDOR) ?? "activos",
    page: paramPagina(sp.page),
  });
  const puedeGestionar = rolTienePermiso(session.user.role, { proveedor: ["gestionar"] });

  return (
    <>
      <PageHeader titulo="Proveedores" descripcion="Empresas o personas a quienes les compras mercadería.">
        {puedeGestionar && <NuevoProveedorButton />}
      </PageHeader>

      <div className="flex flex-col gap-2 sm:flex-row">
        <SearchInput placeholder="Razón social, RUC, contacto o teléfono…" />
        <FilterSelect param="estado" opciones={OPCIONES_ESTADO} todos="Activos" />
      </div>

      <ProveedoresTable proveedores={resultado.items} puedeGestionar={puedeGestionar} />
      <PaginationBar page={resultado.page} pageSize={resultado.pageSize} total={resultado.total} />
    </>
  );
}
