import "server-only";
import type { Prisma } from "../../../generated/prisma/client";
import { prisma } from "@/lib/prisma";

export type UsuarioDTO = {
  id: string;
  name: string;
  username: string | null;
  role: string | null;
  activo: boolean;
  createdAt: string;
};

export async function listarUsuarios({ q }: { q?: string }): Promise<UsuarioDTO[]> {
  const busqueda = q?.trim();
  const where: Prisma.UserWhereInput = busqueda
    ? {
        OR: [
          { name: { contains: busqueda, mode: "insensitive" } },
          { username: { contains: busqueda.toLowerCase() } },
        ],
      }
    : {};

  const usuarios = await prisma.user.findMany({
    where,
    orderBy: [{ banned: "asc" }, { name: "asc" }],
    select: { id: true, name: true, username: true, role: true, banned: true, createdAt: true },
  });

  return usuarios.map((u) => ({
    id: u.id,
    name: u.name,
    username: u.username,
    role: u.role,
    activo: !u.banned,
    createdAt: u.createdAt.toISOString(),
  }));
}
