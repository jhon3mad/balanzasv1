// Lógica de negocio de compras (transaccional). La usan las Server Actions.
import { Prisma } from "../../../generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { AppError } from "@/lib/errors";
import { registrarAuditoria } from "@/lib/auditoria";
import { formatearNumero, siguienteNumero } from "@/lib/correlativo";
import { fechaLimaADate } from "@/lib/dates";
import { estadoPagoDe } from "@/lib/estados";
import { bloquearPresentacion, nuevoCostoPromedio } from "@/lib/stock";
import type { CompraOutput, PagoCompraOutput, RecepcionOutput } from "./schemas";

type Tx = Prisma.TransactionClient;
const D = Prisma.Decimal;
const OPCIONES_TX = { timeout: 20_000 };

/** Calcula unidades, costo unitario y subtotal de cada línea. */
function calcularDetalles(detalles: CompraOutput["detalles"]) {
  return detalles.map((d) => {
    const costoEmpaque = new D(d.costoEmpaque);
    return {
      presentacionId: d.presentacionId,
      empaque: d.empaque,
      unidadesPorEmpaque: d.unidadesPorEmpaque,
      cantidadEmpaques: d.cantidadEmpaques,
      cantidadUnidades: d.unidadesPorEmpaque * d.cantidadEmpaques,
      costoEmpaque,
      costoUnitario: costoEmpaque.div(d.unidadesPorEmpaque).toDecimalPlaces(4),
      subtotal: costoEmpaque.mul(d.cantidadEmpaques).toDecimalPlaces(2),
    };
  });
}

function sumar(valores: Prisma.Decimal[]) {
  return valores.reduce((acc, v) => acc.add(v), new D(0)).toDecimalPlaces(2);
}

async function validarPresentaciones(tx: Tx, ids: number[]) {
  const encontradas = await tx.presentacion.findMany({
    where: { id: { in: ids } },
    select: { id: true, activo: true, producto: { select: { activo: true, nombre: true } } },
  });
  if (encontradas.length !== new Set(ids).size) throw new AppError("Uno de los productos ya no existe.");
  const inactiva = encontradas.find((p) => !p.activo || !p.producto.activo);
  if (inactiva) throw new AppError(`"${inactiva.producto.nombre}" está desactivado; actívalo para comprarlo.`);
}

/** Bloquea la fila de la compra para evitar cambios simultáneos (pagos, recepción, anulación). */
async function bloquearCompra(tx: Tx, compraId: number) {
  await tx.$queryRaw`SELECT id FROM "compra" WHERE id = ${compraId} FOR UPDATE`;
  const compra = await tx.compra.findUnique({ where: { id: compraId }, include: { detalles: true } });
  if (!compra) throw new AppError("La compra no existe.");
  return compra;
}

export async function crearCompra(d: CompraOutput, usuarioId: string) {
  return prisma.$transaction(async (tx) => {
    await validarPresentaciones(tx, d.detalles.map((x) => x.presentacionId));
    const proveedor = await tx.proveedor.findUnique({ where: { id: d.proveedorId } });
    if (!proveedor?.activo) throw new AppError("El proveedor no existe o está desactivado.");

    const detalles = calcularDetalles(d.detalles);
    const { serie, numero } = await siguienteNumero(tx, "COMPRA");
    const compra = await tx.compra.create({
      data: {
        serie,
        numero,
        proveedorId: d.proveedorId,
        fechaPedido: fechaLimaADate(d.fechaPedido),
        documentoProveedor: d.documentoProveedor,
        observaciones: d.observaciones,
        total: sumar(detalles.map((x) => x.subtotal)),
        creadoPorId: usuarioId,
        detalles: { create: detalles },
      },
      include: { detalles: true },
    });

    if (d.recibirAhora) {
      await recibirEnTx(
        tx,
        compra.id,
        {
          fechaRecepcion: d.fechaPedido,
          lineas: compra.detalles.map((x) => ({ detalleId: x.id, cantidadRecibida: x.cantidadUnidades })),
        },
        usuarioId,
      );
    }
    return compra;
  }, OPCIONES_TX);
}

/** Solo los pedidos pendientes se pueden editar; se reemplazan sus líneas. */
export async function actualizarCompra(id: number, d: CompraOutput, usuarioId: string) {
  return prisma.$transaction(async (tx) => {
    const actual = await bloquearCompra(tx, id);
    if (actual.estado !== "PENDIENTE") throw new AppError("Solo se pueden editar pedidos pendientes.");
    await validarPresentaciones(tx, d.detalles.map((x) => x.presentacionId));

    const detalles = calcularDetalles(d.detalles);
    const total = sumar(detalles.map((x) => x.subtotal));
    if (actual.montoPagado.gt(total)) {
      throw new AppError("El nuevo total es menor a lo ya pagado al proveedor. Anula primero algún pago.");
    }

    await tx.compraDetalle.deleteMany({ where: { compraId: id } });
    const compra = await tx.compra.update({
      where: { id },
      data: {
        proveedorId: d.proveedorId,
        fechaPedido: fechaLimaADate(d.fechaPedido),
        documentoProveedor: d.documentoProveedor,
        observaciones: d.observaciones,
        total,
        estadoPago: estadoPagoDe(total.toString(), actual.montoPagado.toString()),
        detalles: { create: detalles },
      },
      include: { detalles: true },
    });

    if (d.recibirAhora) {
      await recibirEnTx(
        tx,
        id,
        {
          fechaRecepcion: d.fechaPedido,
          lineas: compra.detalles.map((x) => ({ detalleId: x.id, cantidadRecibida: x.cantidadUnidades })),
        },
        usuarioId,
      );
    }
    await registrarAuditoria({ usuarioId, accion: "EDITAR_COMPRA", entidad: "compra", entidadId: id }, tx);
    return compra;
  }, OPCIONES_TX);
}

/**
 * Recepción: sube el stock con lo que realmente llegó, recalcula el costo promedio
 * ponderado, registra el kardex y ajusta el total a lo recibido.
 */
async function recibirEnTx(
  tx: Tx,
  compraId: number,
  r: Pick<RecepcionOutput, "fechaRecepcion" | "lineas">,
  usuarioId: string,
) {
  const compra = await bloquearCompra(tx, compraId);
  if (compra.estado !== "PENDIENTE") throw new AppError("Esta compra ya fue recibida o anulada.");
  const numero = formatearNumero(compra.serie, compra.numero);

  const subtotales: Prisma.Decimal[] = [];
  for (const det of compra.detalles) {
    const linea = r.lineas.find((l) => l.detalleId === det.id);
    if (!linea) throw new AppError("Falta indicar la cantidad recibida de un producto.");
    const recibida = linea.cantidadRecibida;

    // Si llegó lo pedido se respeta el subtotal original (evita diferencias de céntimos)
    const subtotal =
      recibida === det.cantidadUnidades ? det.subtotal : det.costoUnitario.mul(recibida).toDecimalPlaces(2);
    subtotales.push(subtotal);
    await tx.compraDetalle.update({ where: { id: det.id }, data: { cantidadRecibida: recibida, subtotal } });

    if (recibida === 0) continue;
    const actual = await bloquearPresentacion(tx, det.presentacionId);
    const stockNuevo = actual.stock + recibida;
    const costoPromedio = nuevoCostoPromedio(actual.stock, actual.costoPromedio, recibida, det.costoUnitario);

    await tx.presentacion.update({
      where: { id: det.presentacionId },
      data: { stock: stockNuevo, costoPromedio, ultimoCosto: det.costoUnitario.toDecimalPlaces(2) },
    });
    await tx.movimientoInventario.create({
      data: {
        presentacionId: det.presentacionId,
        tipo: "COMPRA",
        cantidad: recibida,
        stockAnterior: actual.stock,
        stockNuevo,
        costoUnitario: det.costoUnitario,
        compraId,
        usuarioId,
        nota: `Recepción ${numero}`,
      },
    });
  }

  const total = sumar(subtotales);
  if (compra.montoPagado.gt(total)) {
    throw new AppError(
      "Lo pagado al proveedor supera el total de lo recibido. Anula o corrige los pagos antes de recibir.",
    );
  }
  await tx.compra.update({
    where: { id: compraId },
    data: {
      estado: "RECIBIDA",
      fechaRecepcion: fechaLimaADate(r.fechaRecepcion),
      recibidoPorId: usuarioId,
      total,
      estadoPago: estadoPagoDe(total.toString(), compra.montoPagado.toString()),
    },
  });
}

export async function recibirCompra(r: RecepcionOutput, usuarioId: string) {
  return prisma.$transaction((tx) => recibirEnTx(tx, r.compraId, r, usuarioId), OPCIONES_TX);
}

export async function registrarPagoCompra(p: PagoCompraOutput, usuarioId: string) {
  return prisma.$transaction(async (tx) => {
    const compra = await bloquearCompra(tx, p.compraId);
    if (compra.estado === "ANULADA") throw new AppError("No se puede pagar una compra anulada.");

    const metodo = await tx.metodoPago.findUnique({ where: { id: p.metodoPagoId } });
    if (!metodo?.activo) throw new AppError("El método de pago no existe o está desactivado.");
    if (metodo.requiereReferencia && !p.referencia) {
      throw new AppError(`Para pagos por ${metodo.nombre} indica el número de operación.`);
    }

    const monto = new D(p.monto);
    const saldo = compra.total.sub(compra.montoPagado);
    if (monto.gt(saldo)) throw new AppError(`El monto supera el saldo pendiente (S/ ${saldo.toFixed(2)}).`);

    const montoPagado = compra.montoPagado.add(monto);
    await tx.pagoCompra.create({
      data: {
        compraId: p.compraId,
        metodoPagoId: p.metodoPagoId,
        monto,
        referencia: p.referencia,
        fecha: fechaLimaADate(p.fecha),
        usuarioId,
      },
    });
    await tx.compra.update({
      where: { id: p.compraId },
      data: { montoPagado, estadoPago: estadoPagoDe(compra.total.toString(), montoPagado.toString()) },
    });
    return { saldo: compra.total.sub(montoPagado) };
  }, OPCIONES_TX);
}

export async function anularPagoCompra(pagoId: number, motivo: string, usuarioId: string) {
  return prisma.$transaction(async (tx) => {
    const pago = await tx.pagoCompra.findUnique({ where: { id: pagoId } });
    if (!pago) throw new AppError("El pago no existe.");
    if (pago.anulado) throw new AppError("El pago ya estaba anulado.");
    const compra = await bloquearCompra(tx, pago.compraId);

    const montoPagado = compra.montoPagado.sub(pago.monto);
    await tx.pagoCompra.update({ where: { id: pagoId }, data: { anulado: true, motivoAnulacion: motivo } });
    await tx.compra.update({
      where: { id: compra.id },
      data: { montoPagado, estadoPago: estadoPagoDe(compra.total.toString(), montoPagado.toString()) },
    });
    await registrarAuditoria(
      {
        usuarioId,
        accion: "ANULAR_PAGO_COMPRA",
        entidad: "compra",
        entidadId: compra.id,
        datos: { pagoId, monto: pago.monto.toFixed(2), motivo },
      },
      tx,
    );
    return compra;
  }, OPCIONES_TX);
}

/**
 * Anula la compra. Si ya fue recibida, devuelve el stock (si aún está disponible)
 * y lo registra en el kardex. Exige que no haya pagos vigentes.
 */
export async function anularCompra(compraId: number, motivo: string, usuarioId: string) {
  return prisma.$transaction(async (tx) => {
    const compra = await bloquearCompra(tx, compraId);
    if (compra.estado === "ANULADA") throw new AppError("La compra ya estaba anulada.");
    if (compra.montoPagado.gt(0)) {
      throw new AppError("La compra tiene pagos registrados. Anula primero los pagos.");
    }
    const numero = formatearNumero(compra.serie, compra.numero);

    if (compra.estado === "RECIBIDA") {
      for (const det of compra.detalles) {
        const cantidad = det.cantidadRecibida ?? 0;
        if (cantidad === 0) continue;
        const actual = await bloquearPresentacion(tx, det.presentacionId);
        if (actual.stock < cantidad) {
          throw new AppError(
            `No se puede anular: de "${actual.nombre}" solo quedan ${actual.stock} en stock y la compra ingresó ${cantidad}. Usa un ajuste de inventario.`,
          );
        }
        // El costo promedio se mantiene: las unidades que salen se valorizan al promedio vigente.
        await tx.presentacion.update({ where: { id: det.presentacionId }, data: { stock: actual.stock - cantidad } });
        await tx.movimientoInventario.create({
          data: {
            presentacionId: det.presentacionId,
            tipo: "ANULACION_COMPRA",
            cantidad: -cantidad,
            stockAnterior: actual.stock,
            stockNuevo: actual.stock - cantidad,
            costoUnitario: det.costoUnitario,
            compraId,
            usuarioId,
            nota: `Anulación ${numero}`,
          },
        });
      }
    }

    await tx.compra.update({
      where: { id: compraId },
      data: { estado: "ANULADA", anuladoPorId: usuarioId, fechaAnulacion: new Date(), motivoAnulacion: motivo },
    });
    await registrarAuditoria(
      { usuarioId, accion: "ANULAR_COMPRA", entidad: "compra", entidadId: compraId, datos: { numero, motivo } },
      tx,
    );
    return { numero };
  }, OPCIONES_TX);
}
