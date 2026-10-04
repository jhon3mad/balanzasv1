"use client";

import { useState } from "react";
import { KeyRoundIcon, MoreHorizontalIcon, PencilIcon, UserCheckIcon, UserXIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatFecha } from "@/lib/dates";
import { isRol, ROL_LABELS } from "@/lib/permissions";
import type { UsuarioDTO } from "../queries";
import { CambiarEstadoDialog } from "./cambiar-estado-dialog";
import { EditarUsuarioDialog } from "./editar-usuario-dialog";
import { RestablecerClaveDialog } from "./restablecer-clave-dialog";

type Dialogo = { tipo: "editar" | "clave" | "estado"; usuario: UsuarioDTO } | null;

export function UsuariosTable({ usuarios, usuarioActualId }: { usuarios: UsuarioDTO[]; usuarioActualId: string }) {
  const [dialogo, setDialogo] = useState<Dialogo>(null);
  const cerrar = (open: boolean) => {
    if (!open) setDialogo(null);
  };

  return (
    <>
      <div className="rounded-xl border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nombre</TableHead>
              <TableHead>Usuario</TableHead>
              <TableHead>Rol</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="hidden md:table-cell">Creado</TableHead>
              <TableHead className="w-12">
                <span className="sr-only">Acciones</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {usuarios.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                  No se encontraron usuarios.
                </TableCell>
              </TableRow>
            )}
            {usuarios.map((u) => {
              const esActual = u.id === usuarioActualId;
              return (
                <TableRow key={u.id} className={u.activo ? undefined : "text-muted-foreground"}>
                  <TableCell className="font-medium">
                    {u.name}
                    {esActual && <span className="ml-2 text-xs text-muted-foreground">(tú)</span>}
                  </TableCell>
                  <TableCell>@{u.username}</TableCell>
                  <TableCell>
                    <Badge variant={u.role === "admin" ? "default" : "secondary"}>
                      {isRol(u.role) ? ROL_LABELS[u.role] : "Sin rol"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={u.activo ? "outline" : "destructive"}>{u.activo ? "Activo" : "Inactivo"}</Badge>
                  </TableCell>
                  <TableCell className="hidden md:table-cell">{formatFecha(u.createdAt)}</TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger render={<Button variant="ghost" size="icon-sm" aria-label="Acciones" />}>
                        <MoreHorizontalIcon />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-52">
                        <DropdownMenuItem onClick={() => setDialogo({ tipo: "editar", usuario: u })}>
                          <PencilIcon />
                          Editar
                        </DropdownMenuItem>
                        {!esActual && (
                          <DropdownMenuItem onClick={() => setDialogo({ tipo: "clave", usuario: u })}>
                            <KeyRoundIcon />
                            Restablecer contraseña
                          </DropdownMenuItem>
                        )}
                        {!esActual && (
                          <>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              variant={u.activo ? "destructive" : "default"}
                              onClick={() => setDialogo({ tipo: "estado", usuario: u })}
                            >
                              {u.activo ? <UserXIcon /> : <UserCheckIcon />}
                              {u.activo ? "Desactivar" : "Activar"}
                            </DropdownMenuItem>
                          </>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {dialogo?.tipo === "editar" && (
        <EditarUsuarioDialog
          usuario={dialogo.usuario}
          esUsuarioActual={dialogo.usuario.id === usuarioActualId}
          open
          onOpenChange={cerrar}
        />
      )}
      {dialogo?.tipo === "clave" && <RestablecerClaveDialog usuario={dialogo.usuario} open onOpenChange={cerrar} />}
      {dialogo?.tipo === "estado" && <CambiarEstadoDialog usuario={dialogo.usuario} open onOpenChange={cerrar} />}
    </>
  );
}
