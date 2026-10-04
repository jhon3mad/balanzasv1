import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeftIcon, TriangleAlertIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { EstadoBadge } from "@/components/data/estado-badge";
import { PageHeader } from "@/components/layout/page-header";
import { formatFechaHora } from "@/lib/dates";
import { formatNumero, formatPEN } from "@/lib/money";
import { rolTienePermiso } from "@/lib/permissions";
import { paramId } from "@/lib/search-params";
import { requirePermission } from "@/lib/session";
import { FUNCIONAMIENTO_LABELS, TIPO_ENCHUFE_LABELS, TIPO_PRODUCTO_LABELS } from "@/features/productos/constants";
import { obtenerProducto } from "@/features/productos/queries";
import { ProductoAcciones } from "@/features/productos/components/producto-acciones";

export const metadata: Metadata = { title: "Producto" };

function Dato({ label, valor }: { label: string; valor: React.ReactNode }) {
  return (
    <div className="space-y-0.5">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="text-sm font-medium">{valor ?? "—"}</dd>
    </div>
  );
}

export default async function ProductoPage({ params }: PageProps<"/productos/[id]">) {
  const session = await requirePermission({ producto: ["ver"] });
  const rol = session.user.role;
  const verCosto = rolTienePermiso(rol, { producto: ["verCosto"] });
  const verKardex = rolTienePermiso(rol, { inventario: ["verKardex"] });
  const id = paramId((await params).id);
  const producto = id ? await obtenerProducto(id, { verCosto }) : null;
  if (!producto) notFound();

  const tieneHistorial = producto.presentaciones.some((p) => p.tieneHistorial);

  return (
    <>
      <div>
        <Button variant="ghost" size="sm" className="-ml-2" nativeButton={false} render={<Link href="/productos" />}>
          <ArrowLeftIcon />
          Productos
        </Button>
      </div>
      <PageHeader titulo={producto.nombre}>
        <ProductoAcciones
          producto={producto}
          puedeEditar={rolTienePermiso(rol, { producto: ["editar"] })}
          puedeEliminar={rolTienePermiso(rol, { producto: ["eliminar"] })}
          tieneHistorial={tieneHistorial}
        />
      </PageHeader>

      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="secondary">{TIPO_PRODUCTO_LABELS[producto.tipo]}</Badge>
        <EstadoBadge activo={producto.activo} />
        {producto.stockBajo && (
          <Badge variant="destructive">
            <TriangleAlertIcon />
            Stock bajo
          </Badge>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Características</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {producto.tipo !== "ENCHUFE" && <Dato label="Marca" valor={producto.marca} />}
            <Dato label="Modelo" valor={producto.modelo} />
            {producto.uso && <Dato label="Tipo de uso" valor={producto.uso} />}
            {producto.forma && <Dato label="Forma" valor={producto.forma} />}
            {producto.funcionamiento && (
              <Dato label="Funcionamiento" valor={FUNCIONAMIENTO_LABELS[producto.funcionamiento]} />
            )}
            {producto.capacidadKg && (
              <Dato
                label={producto.tipo === "SENSOR" ? "Para balanzas de" : "Capacidad"}
                valor={`${formatNumero(producto.capacidadKg)} kg`}
              />
            )}
            {producto.precisionG && <Dato label="Precisión" valor={`${formatNumero(producto.precisionG)} g`} />}
            {producto.voltaje && <Dato label="Voltaje" valor={`${formatNumero(producto.voltaje)} V`} />}
            {producto.tipoEnchufe && <Dato label="Tipo de entrada" valor={TIPO_ENCHUFE_LABELS[producto.tipoEnchufe]} />}
            <Dato label="Stock total" valor={producto.stockTotal} />
            <Dato label="Registrado" valor={formatFechaHora(producto.createdAt)} />
            <Dato label="Última modificación" valor={formatFechaHora(producto.updatedAt)} />
          </dl>
          {(producto.descripcion || producto.observaciones) && (
            <dl className="mt-6 grid gap-4 border-t pt-4 md:grid-cols-2">
              {producto.descripcion && <Dato label="Descripción" valor={producto.descripcion} />}
              {producto.observaciones && <Dato label="Observaciones" valor={producto.observaciones} />}
            </dl>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Presentaciones</CardTitle>
          <CardDescription>El stock cambia con compras, ventas y ajustes de inventario.</CardDescription>
        </CardHeader>
        <CardContent className="px-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-6">Presentación</TableHead>
                <TableHead>Código</TableHead>
                <TableHead className="text-right">Precio venta</TableHead>
                <TableHead className="text-right">Precio mínimo</TableHead>
                {verCosto && <TableHead className="text-right">Costo prom.</TableHead>}
                <TableHead className="text-right">Stock</TableHead>
                <TableHead className="pr-6">Estado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {producto.presentaciones.map((p) => {
                const bajo = p.activo && p.stock <= p.stockMinimo;
                return (
                  <TableRow key={p.id} className={p.activo ? undefined : "text-muted-foreground"}>
                    <TableCell className="pl-6">
                      <div className="font-medium">{p.nombre}</div>
                      {p.unidadesPorCaja && (
                        <div className="text-xs text-muted-foreground">Caja de {p.unidadesPorCaja} und.</div>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="font-mono text-sm">{p.codigo}</div>
                      {p.codigoBarras && <div className="font-mono text-xs text-muted-foreground">{p.codigoBarras}</div>}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{formatPEN(p.precioVenta)}</TableCell>
                    <TableCell className="text-right tabular-nums">{formatPEN(p.precioMinimo)}</TableCell>
                    {verCosto && (
                      <TableCell className="text-right tabular-nums">
                        {Number(p.costoPromedio) > 0 ? formatPEN(p.costoPromedio) : "—"}
                      </TableCell>
                    )}
                    <TableCell className="text-right tabular-nums">
                      <span className={bajo ? "font-medium text-destructive" : undefined}>{p.stock}</span>
                      <div className="text-xs text-muted-foreground">mín. {p.stockMinimo}</div>
                      {verKardex && (
                        <Link href={`/inventario/kardex?presentacion=${p.id}`} className="text-xs text-primary hover:underline">
                          Ver kardex
                        </Link>
                      )}
                    </TableCell>
                    <TableCell className="pr-6">
                      <EstadoBadge activo={p.activo} />
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </>
  );
}
