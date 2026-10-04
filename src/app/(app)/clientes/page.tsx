import type { Metadata } from "next";
import { PageHeader } from "@/components/layout/page-header";
import { FilterSelect } from "@/components/data/filter-select";
import { PaginationBar } from "@/components/data/pagination-bar";
import { SearchInput } from "@/components/data/search-input";
import { rolTienePermiso } from "@/lib/permissions";
import { paramEnum, paramPagina, paramTexto } from "@/lib/search-params";
import { requirePermission } from "@/lib/session";
import { ESTADOS_CLIENTE } from "@/features/clientes/schemas";
import { listarClientes } from "@/features/clientes/queries";
import { ClientesTable, NuevoClienteButton } from "@/features/clientes/components/clientes-table";

export const metadata: Metadata = { title: "Clientes" };

const OPCIONES_ESTADO = [
  { value: "inactivos", label: "Inactivos" },
  { value: "todos", label: "Todos" },
];
const OPCIONES_DEUDA = [{ value: "si", label: "Con saldo pendiente" }];

export default async function ClientesPage({ searchParams }: PageProps<"/clientes">) {
  const session = await requirePermission({ cliente: ["ver"] });
  const sp = await searchParams;
  const resultado = await listarClientes({
    q: paramTexto(sp.q),
    estado: paramEnum(sp.estado, ESTADOS_CLIENTE) ?? "activos",
    conDeuda: paramTexto(sp.deuda) === "si",
    page: paramPagina(sp.page),
  });
  const puedeGestionar = rolTienePermiso(session.user.role, { cliente: ["gestionar"] });

  return (
    <>
      <PageHeader
        titulo="Clientes"
        descripcion="Clientes registrados. Las ventas rápidas pueden hacerse como “Cliente general” sin registrar datos."
      >
        {puedeGestionar && <NuevoClienteButton />}
      </PageHeader>

      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
        <SearchInput placeholder="Nombre, DNI/RUC o celular…" />
        <FilterSelect param="estado" opciones={OPCIONES_ESTADO} todos="Activos" />
        <FilterSelect param="deuda" opciones={OPCIONES_DEUDA} todos="Con y sin deuda" className="w-full sm:w-52" />
      </div>

      <ClientesTable clientes={resultado.items} puedeGestionar={puedeGestionar} />
      <PaginationBar page={resultado.page} pageSize={resultado.pageSize} total={resultado.total} />
    </>
  );
}
