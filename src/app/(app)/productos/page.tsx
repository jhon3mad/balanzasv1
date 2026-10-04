import type { Metadata } from "next";
import Link from "next/link";
import { PlusIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/layout/page-header";
import { FilterSelect } from "@/components/data/filter-select";
import { PaginationBar } from "@/components/data/pagination-bar";
import { SearchInput } from "@/components/data/search-input";
import { rolTienePermiso } from "@/lib/permissions";
import { paramEnum, paramId, paramPagina, paramTexto } from "@/lib/search-params";
import { requirePermission } from "@/lib/session";
import { ESTADOS_FILTRO, TIPO_PRODUCTO_LABELS, TIPOS_PRODUCTO } from "@/features/productos/constants";
import { listarProductos, opcionesMarcas } from "@/features/productos/queries";
import { ProductosTable } from "@/features/productos/components/productos-table";

export const metadata: Metadata = { title: "Productos" };

const OPCIONES_TIPO = TIPOS_PRODUCTO.map((t) => ({ value: t, label: TIPO_PRODUCTO_LABELS[t] }));
const OPCIONES_ESTADO = [
  { value: "inactivos", label: "Inactivos" },
  { value: "todos", label: "Todos" },
];

export default async function ProductosPage({ searchParams }: PageProps<"/productos">) {
  const session = await requirePermission({ producto: ["ver"] });
  const sp = await searchParams;
  const [resultado, marcas] = await Promise.all([
    listarProductos({
      q: paramTexto(sp.q),
      tipo: paramEnum(sp.tipo, TIPOS_PRODUCTO),
      marcaId: paramId(sp.marca),
      estado: paramEnum(sp.estado, ESTADOS_FILTRO) ?? "activos",
      page: paramPagina(sp.page),
    }),
    opcionesMarcas(),
  ]);
  const puedeCrear = rolTienePermiso(session.user.role, { producto: ["crear"] });

  return (
    <>
      <PageHeader titulo="Productos" descripcion="Balanzas, baterías, enchufes, sensores, tarjetas y repuestos.">
        {puedeCrear && (
          <Button nativeButton={false} render={<Link href="/productos/nuevo" />}>
            <PlusIcon />
            Nuevo producto
          </Button>
        )}
      </PageHeader>

      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
        <SearchInput placeholder="Nombre, modelo, marca o código…" />
        <FilterSelect param="tipo" opciones={OPCIONES_TIPO} todos="Todos los tipos" />
        <FilterSelect param="marca" opciones={marcas} todos="Todas las marcas" />
        <FilterSelect param="estado" opciones={OPCIONES_ESTADO} todos="Activos" />
      </div>

      <ProductosTable productos={resultado.items} />
      <PaginationBar page={resultado.page} pageSize={resultado.pageSize} total={resultado.total} />
    </>
  );
}
