import type { Metadata } from "next";
import { SearchIcon } from "lucide-react";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import { PageHeader } from "@/components/layout/page-header";
import { requirePermission } from "@/lib/session";
import { listarUsuarios } from "@/features/usuarios/queries";
import { CrearUsuarioDialog } from "@/features/usuarios/components/crear-usuario-dialog";
import { UsuariosTable } from "@/features/usuarios/components/usuarios-table";

export const metadata: Metadata = { title: "Usuarios" };

export default async function UsuariosPage({ searchParams }: PageProps<"/usuarios">) {
  const session = await requirePermission({ user: ["list"] });
  const { q } = await searchParams;
  const busqueda = typeof q === "string" ? q : "";
  const usuarios = await listarUsuarios({ q: busqueda });

  return (
    <>
      <PageHeader titulo="Usuarios" descripcion="Personal con acceso al sistema y su rol.">
        <CrearUsuarioDialog />
      </PageHeader>

      <form className="max-w-sm" role="search">
        <InputGroup>
          <InputGroupAddon>
            <SearchIcon />
          </InputGroupAddon>
          <InputGroupInput name="q" type="search" placeholder="Buscar por nombre o usuario…" defaultValue={busqueda} />
        </InputGroup>
      </form>

      <UsuariosTable usuarios={usuarios} usuarioActualId={session.user.id} />
    </>
  );
}
