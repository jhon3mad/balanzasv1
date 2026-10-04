"use client";

import { useState } from "react";
import Link from "next/link";
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
import { formatPEN } from "@/lib/money";
import { cambiarEstadoClienteAction, eliminarClienteAction } from "../actions";
import type { ClienteDTO } from "../queries";
import { documentoCliente } from "../schemas";
import { ClienteDialog } from "./cliente-dialog";

type Dialogo = { tipo: "form"; cliente?: ClienteDTO } | { tipo: "estado" | "eliminar"; cliente: ClienteDTO } | null;

export function NuevoClienteButton() {
  const [abierto, setAbierto] = useState(false);
  return (
    <>
      <Button onClick={() => setAbierto(true)}>
        <PlusIcon />
        Nuevo cliente
      </Button>
      {abierto && <ClienteDialog onClose={() => setAbierto(false)} />}
    </>
  );
}

export function ClientesTable({ clientes, puedeGestionar }: { clientes: ClienteDTO[]; puedeGestionar: boolean }) {
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
              <TableHead>Cliente</TableHead>
              <TableHead>Contacto</TableHead>
              <TableHead className="text-right">Ventas</TableHead>
              <TableHead className="text-right">Saldo pendiente</TableHead>
              <TableHead>Estado</TableHead>
              {puedeGestionar && (
                <TableHead className="w-12">
                  <span className="sr-only">Acciones</span>
                </TableHead>
              )}
            </TableRow>
          </TableHeader>
          <TableBody>
            {clientes.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                  No se encontraron clientes.
                </TableCell>
              </TableRow>
            )}
            {clientes.map((c) => {
              const documento = documentoCliente(c.tipoDocumento, c.numeroDocumento);
              const conDeuda = Number(c.saldo) > 0;
              return (
                <TableRow key={c.id} className={c.activo ? undefined : "text-muted-foreground"}>
                  <TableCell className="max-w-sm whitespace-normal">
                    <div className="font-medium">{c.nombre}</div>
                    {documento && <div className="font-mono text-xs text-muted-foreground">{documento}</div>}
                    {c.notas && <div className="truncate text-xs text-muted-foreground">{c.notas}</div>}
                  </TableCell>
                  <TableCell>
                    <div>{c.telefono ?? "—"}</div>
                    {c.direccion && <div className="max-w-xs truncate text-xs text-muted-foreground">{c.direccion}</div>}
                  </TableCell>
                  <TableCell className="text-right">
                    <Badge variant="secondary">{c.ventas}</Badge>
                  </TableCell>
                  <TableCell className={conDeuda ? "text-right font-medium text-destructive tabular-nums" : "text-right text-muted-foreground tabular-nums"}>
                    {conDeuda ? (
                      <Link href={`/ventas?cliente=${c.id}&pago=DEUDA`} className="hover:underline">
                        {formatPEN(c.saldo)}
                      </Link>
                    ) : (
                      "—"
                    )}
                  </TableCell>
                  <TableCell>
                    <EstadoBadge activo={c.activo} />
                  </TableCell>
                  {puedeGestionar && (
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger render={<Button variant="ghost" size="icon-sm" aria-label="Acciones" />}>
                          <MoreHorizontalIcon />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48">
                          <DropdownMenuItem onClick={() => setDialogo({ tipo: "form", cliente: c })}>
                            <PencilIcon />
                            Editar
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => setDialogo({ tipo: "estado", cliente: c })}>
                            {c.activo ? <PowerOffIcon /> : <PowerIcon />}
                            {c.activo ? "Desactivar" : "Activar"}
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            variant="destructive"
                            disabled={c.ventas > 0}
                            onClick={() => setDialogo({ tipo: "eliminar", cliente: c })}
                          >
                            <Trash2Icon />
                            {c.ventas > 0 ? "Tiene ventas" : "Eliminar"}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  )}
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {dialogo?.tipo === "form" && <ClienteDialog cliente={dialogo.cliente} onClose={() => setDialogo(null)} />}
      {dialogo?.tipo === "estado" && (
        <ConfirmDialog
          open
          onOpenChange={cerrar}
          titulo={dialogo.cliente.activo ? "¿Desactivar cliente?" : "¿Activar cliente?"}
          descripcion={
            dialogo.cliente.activo
              ? `"${dialogo.cliente.nombre}" ya no aparecerá al registrar ventas. Su historial se conserva.`
              : `"${dialogo.cliente.nombre}" volverá a aparecer al registrar ventas.`
          }
          confirmarTexto={dialogo.cliente.activo ? "Desactivar" : "Activar"}
          destructivo={dialogo.cliente.activo}
          onConfirm={() => cambiarEstadoClienteAction({ id: dialogo.cliente.id, activo: !dialogo.cliente.activo })}
        />
      )}
      {dialogo?.tipo === "eliminar" && (
        <ConfirmDialog
          open
          onOpenChange={cerrar}
          titulo="¿Eliminar cliente?"
          descripcion={`Se eliminará "${dialogo.cliente.nombre}". Esta acción no se puede deshacer.`}
          confirmarTexto="Eliminar"
          destructivo
          onConfirm={() => eliminarClienteAction({ id: dialogo.cliente.id })}
        />
      )}
    </>
  );
}
