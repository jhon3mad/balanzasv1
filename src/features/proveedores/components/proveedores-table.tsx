"use client";

import { useState } from "react";
import { MoreHorizontalIcon, PencilIcon, PlusIcon, PowerIcon, PowerOffIcon, Trash2Icon } from "lucide-react";
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
import { ConfirmDialog } from "@/components/data/confirm-dialog";
import { EstadoBadge } from "@/components/data/estado-badge";
import { cambiarEstadoProveedorAction, eliminarProveedorAction } from "../actions";
import type { ProveedorDTO } from "../queries";
import { ProveedorDialog } from "./proveedor-dialog";

type Dialogo =
  | { tipo: "form"; proveedor?: ProveedorDTO }
  | { tipo: "estado" | "eliminar"; proveedor: ProveedorDTO }
  | null;

export function NuevoProveedorButton() {
  const [abierto, setAbierto] = useState(false);
  return (
    <>
      <Button onClick={() => setAbierto(true)}>
        <PlusIcon />
        Nuevo proveedor
      </Button>
      {abierto && <ProveedorDialog onClose={() => setAbierto(false)} />}
    </>
  );
}

export function ProveedoresTable({ proveedores, puedeGestionar }: { proveedores: ProveedorDTO[]; puedeGestionar: boolean }) {
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
              <TableHead>Proveedor</TableHead>
              <TableHead>Contacto</TableHead>
              <TableHead className="hidden lg:table-cell">Dirección</TableHead>
              <TableHead>Compras</TableHead>
              <TableHead>Estado</TableHead>
              {puedeGestionar && (
                <TableHead className="w-12">
                  <span className="sr-only">Acciones</span>
                </TableHead>
              )}
            </TableRow>
          </TableHeader>
          <TableBody>
            {proveedores.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                  No se encontraron proveedores.
                </TableCell>
              </TableRow>
            )}
            {proveedores.map((p) => (
              <TableRow key={p.id} className={p.activo ? undefined : "text-muted-foreground"}>
                <TableCell>
                  <div className="font-medium">{p.razonSocial}</div>
                  {p.ruc && <div className="font-mono text-xs text-muted-foreground">RUC {p.ruc}</div>}
                </TableCell>
                <TableCell>
                  {p.contacto && <div>{p.contacto}</div>}
                  <div className="text-xs text-muted-foreground">
                    {[p.telefono, p.email].filter(Boolean).join(" · ") || (p.contacto ? "" : "—")}
                  </div>
                </TableCell>
                <TableCell className="hidden max-w-xs truncate lg:table-cell">{p.direccion ?? "—"}</TableCell>
                <TableCell>
                  <Badge variant="secondary">{p.compras}</Badge>
                </TableCell>
                <TableCell>
                  <EstadoBadge activo={p.activo} />
                </TableCell>
                {puedeGestionar && (
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger render={<Button variant="ghost" size="icon-sm" aria-label="Acciones" />}>
                        <MoreHorizontalIcon />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-48">
                        <DropdownMenuItem onClick={() => setDialogo({ tipo: "form", proveedor: p })}>
                          <PencilIcon />
                          Editar
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setDialogo({ tipo: "estado", proveedor: p })}>
                          {p.activo ? <PowerOffIcon /> : <PowerIcon />}
                          {p.activo ? "Desactivar" : "Activar"}
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          variant="destructive"
                          disabled={p.compras > 0}
                          onClick={() => setDialogo({ tipo: "eliminar", proveedor: p })}
                        >
                          <Trash2Icon />
                          {p.compras > 0 ? "Tiene compras" : "Eliminar"}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {dialogo?.tipo === "form" && <ProveedorDialog proveedor={dialogo.proveedor} onClose={() => setDialogo(null)} />}
      {dialogo?.tipo === "estado" && (
        <ConfirmDialog
          open
          onOpenChange={cerrar}
          titulo={dialogo.proveedor.activo ? "¿Desactivar proveedor?" : "¿Activar proveedor?"}
          descripcion={
            dialogo.proveedor.activo
              ? `"${dialogo.proveedor.razonSocial}" ya no aparecerá al registrar compras. Su historial se conserva.`
              : `"${dialogo.proveedor.razonSocial}" volverá a aparecer al registrar compras.`
          }
          confirmarTexto={dialogo.proveedor.activo ? "Desactivar" : "Activar"}
          destructivo={dialogo.proveedor.activo}
          onConfirm={() => cambiarEstadoProveedorAction({ id: dialogo.proveedor.id, activo: !dialogo.proveedor.activo })}
        />
      )}
      {dialogo?.tipo === "eliminar" && (
        <ConfirmDialog
          open
          onOpenChange={cerrar}
          titulo="¿Eliminar proveedor?"
          descripcion={`Se eliminará "${dialogo.proveedor.razonSocial}". Esta acción no se puede deshacer.`}
          confirmarTexto="Eliminar"
          destructivo
          onConfirm={() => eliminarProveedorAction({ id: dialogo.proveedor.id })}
        />
      )}
    </>
  );
}
