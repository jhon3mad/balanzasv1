// Lógica de negocio de productos (transaccional). La usan las Server Actions.
import type { Prisma } from "../../../generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { AppError } from "@/lib/errors";
import { registrarAuditoria } from "@/lib/auditoria";
import type { FieldErrors } from "@/lib/action-result";
import type { ProductoOutput } from "./schemas";

type Tx = Prisma.TransactionClient;
type PresentacionData = ProductoOutput["presentaciones"][number];

function datosProducto(d: ProductoOutput) {
  return {
    tipo: d.tipo,
    nombre: d.nombre,
    modelo: d.modelo,
    marcaId: d.marcaId,
    descripcion: d.descripcion,
    observaciones: d.observaciones,
    usoId: d.usoId,
    formaId: d.formaId,
    funcionamiento: d.funcionamiento,
    capacidadKg: d.capacidadKg,
    precisionG: d.precisionG,
    voltaje: d.voltaje,
    tipoEnchufe: d.tipoEnchufe,
  };
}

function datosPresentacion(p: PresentacionData) {
  return {
    nombre: p.nombre,
    codigo: p.codigo,
    codigoBarras: p.codigoBarras,
    precioVenta: p.precioVenta,
    precioMinimo: p.precioMinimo,
    stockMinimo: p.stockMinimo,
    unidadesPorCaja: p.unidadesPorCaja,
    activo: p.activo,
  };
}

/** Verifica que códigos y códigos de barras no estén usados por otras presentaciones. */
export async function validarCodigosUnicos(
  presentaciones: PresentacionData[],
  productoId?: number,
): Promise<FieldErrors | null> {
  const codigos = presentaciones.map((p) => p.codigo);
  const barras = presentaciones.map((p) => p.codigoBarras).filter((b): b is string => !!b);
  const existentes = await prisma.presentacion.findMany({
    where: {
      OR: [{ codigo: { in: codigos } }, ...(barras.length ? [{ codigoBarras: { in: barras } }] : [])],
      ...(productoId ? { NOT: { productoId } } : {}),
    },
    select: { codigo: true, codigoBarras: true, producto: { select: { nombre: true } } },
  });
  if (existentes.length === 0) return null;

  const errores: FieldErrors = {};
  presentaciones.forEach((p, i) => {
    const porCodigo = existentes.find((e) => e.codigo === p.codigo);
    if (porCodigo) errores[`presentaciones.${i}.codigo`] = [`Ya lo usa "${porCodigo.producto.nombre}"`];
    const porBarras = p.codigoBarras ? existentes.find((e) => e.codigoBarras === p.codigoBarras) : undefined;
    if (porBarras) errores[`presentaciones.${i}.codigoBarras`] = [`Ya lo usa "${porBarras.producto.nombre}"`];
  });
  return errores;
}

/** Crea una presentación y, si corresponde, registra su inventario inicial en el kardex. */
async function crearPresentacion(
  tx: Tx,
  productoId: number,
  p: PresentacionData,
  usuarioId: string,
  ajuste: { id: number | null },
) {
  const stock = p.stockInicial ?? 0;
  const costo = stock > 0 ? (p.costoInicial ?? "0") : "0";
  const presentacion = await tx.presentacion.create({
    data: {
      ...datosPresentacion(p),
      productoId,
      stock,
      costoPromedio: costo,
      ultimoCosto: costo,
    },
  });

  if (stock > 0) {
    ajuste.id ??= (
      await tx.ajusteInventario.create({
        data: { motivo: "INVENTARIO_INICIAL", observacion: "Stock inicial al registrar el producto", usuarioId },
      })
    ).id;
    await tx.movimientoInventario.create({
      data: {
        presentacionId: presentacion.id,
        tipo: "INVENTARIO_INICIAL",
        cantidad: stock,
        stockAnterior: 0,
        stockNuevo: stock,
        costoUnitario: costo,
        ajusteId: ajuste.id,
        usuarioId,
        nota: "Inventario inicial",
      },
    });
  }
  return presentacion;
}

export async function crearProducto(d: ProductoOutput, usuarioId: string) {
  return prisma.$transaction(async (tx) => {
    const producto = await tx.producto.create({ data: datosProducto(d) });
    const ajuste = { id: null as number | null };
    for (const p of d.presentaciones) {
      await crearPresentacion(tx, producto.id, p, usuarioId, ajuste);
    }
    await registrarAuditoria(
      { usuarioId, accion: "CREAR_PRODUCTO", entidad: "producto", entidadId: producto.id, datos: { nombre: d.nombre } },
      tx,
    );
    return producto;
  });
}

export async function actualizarProducto(id: number, d: ProductoOutput, usuarioId: string) {
  return prisma.$transaction(async (tx) => {
    const actual = await tx.producto.findUnique({ where: { id }, include: { presentaciones: true } });
    if (!actual) throw new AppError("El producto no existe.");
    if (actual.tipo !== d.tipo) throw new AppError("No se puede cambiar el tipo de un producto ya registrado.");

    const producto = await tx.producto.update({ where: { id }, data: datosProducto(d) });
    const ajuste = { id: null as number | null };
    const cambiosPrecio: Prisma.InputJsonValue[] = [];

    for (const p of d.presentaciones) {
      if (!p.id) {
        await crearPresentacion(tx, id, p, usuarioId, ajuste);
        continue;
      }
      const existente = actual.presentaciones.find((e) => e.id === p.id);
      if (!existente) throw new AppError("Una de las presentaciones no pertenece a este producto.");

      // Stock y costo no se editan aquí: cambian con compras, ventas y ajustes.
      await tx.presentacion.update({ where: { id: p.id }, data: datosPresentacion(p) });

      const ventaAntes = existente.precioVenta.toFixed(2);
      const minimoAntes = existente.precioMinimo.toFixed(2);
      if (ventaAntes !== Number(p.precioVenta).toFixed(2) || minimoAntes !== Number(p.precioMinimo).toFixed(2)) {
        cambiosPrecio.push({
          presentacion: p.codigo,
          antes: { venta: ventaAntes, minimo: minimoAntes },
          ahora: { venta: p.precioVenta, minimo: p.precioMinimo },
        });
      }
    }

    await registrarAuditoria(
      { usuarioId, accion: "EDITAR_PRODUCTO", entidad: "producto", entidadId: id, datos: { nombre: d.nombre } },
      tx,
    );
    if (cambiosPrecio.length) {
      await registrarAuditoria(
        { usuarioId, accion: "CAMBIAR_PRECIO", entidad: "producto", entidadId: id, datos: cambiosPrecio },
        tx,
      );
    }
    return producto;
  });
}

export async function cambiarEstadoProducto(id: number, activo: boolean, usuarioId: string) {
  const producto = await prisma.producto.update({ where: { id }, data: { activo } });
  await registrarAuditoria({
    usuarioId,
    accion: activo ? "ACTIVAR_PRODUCTO" : "DESACTIVAR_PRODUCTO",
    entidad: "producto",
    entidadId: id,
  });
  return producto;
}

/** Solo se elimina si ninguna presentación tiene movimientos, compras o ventas. */
export async function eliminarProducto(id: number, usuarioId: string) {
  return prisma.$transaction(async (tx) => {
    const producto = await tx.producto.findUnique({
      where: { id },
      include: {
        presentaciones: {
          select: { id: true, _count: { select: { movimientos: true, compraDetalles: true, ventaDetalles: true } } },
        },
      },
    });
    if (!producto) throw new AppError("El producto no existe.");

    const conHistorial = producto.presentaciones.some(
      (p) => p._count.compraDetalles > 0 || p._count.ventaDetalles > 0 || p._count.movimientos > 0,
    );
    if (conHistorial) {
      throw new AppError("El producto tiene movimientos de inventario, compras o ventas. Desactívalo en lugar de eliminarlo.");
    }

    await tx.presentacion.deleteMany({ where: { productoId: id } });
    await tx.producto.delete({ where: { id } });
    await registrarAuditoria(
      { usuarioId, accion: "ELIMINAR_PRODUCTO", entidad: "producto", entidadId: id, datos: { nombre: producto.nombre } },
      tx,
    );
    return producto;
  });
}
