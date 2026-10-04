// Emisión de ventas (transaccional). La usan las Server Actions.
import { Prisma } from "../../../generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { AppError } from "@/lib/errors";
import { registrarAuditoria } from "@/lib/auditoria";
import { formatearNumero, siguienteNumero } from "@/lib/correlativo";
import { estadoPagoDe } from "@/lib/estados";
import { bloquearPresentacion, nuevoCostoPromedio } from "@/lib/stock";
import type { CobroOutput, VentaOutput } from "./schemas";

type Tx = Prisma.TransactionClient;
const D = Prisma.Decimal;
const OPCIONES_TX = { timeout: 20_000 };

type MetodoPagoFila = { nombre: string; activo: boolean; esEfectivo: boolean; requiereReferencia: boolean };

/** Valida un pago contra su método (activo, referencia, vuelto solo en efectivo). */
export function validarPago(
  metodo: MetodoPagoFila | null | undefined,
  p: { referencia: string | null; montoRecibido: string | null },
): asserts metodo is MetodoPagoFila {
  if (!metodo?.activo) throw new AppError("Uno de los métodos de pago no existe o está desactivado.");
  if (metodo.requiereReferencia && !p.referencia) {
    throw new AppError(`Para pagos por ${metodo.nombre} indica el número de operación.`);
  }
  if (p.montoRecibido !== null && !metodo.esEfectivo) {
    throw new AppError("El monto recibido (vuelto) solo aplica a pagos en efectivo.");
  }
}

/** Bloquea la fila de la venta para evitar cambios simultáneos (cobros, entrega, anulación). */
async function bloquearVenta(tx: Tx, ventaId: number) {
  await tx.$queryRaw`SELECT id FROM "venta" WHERE id = ${ventaId} FOR UPDATE`;
  const venta = await tx.venta.findUnique({ where: { id: ventaId }, include: { detalles: true, pagos: true } });
  if (!venta) throw new AppError("La venta no existe.");
  return { ...venta, numeroTexto: venta.serie && venta.numero ? formatearNumero(venta.serie, venta.numero) : `#${venta.id}` };
}

type Contexto = {
  usuarioId: string;
  /** Rol con permiso venta:precioBajoMinimo */
  permitirBajoMinimo: boolean;
};

export type VentaEmitida = {
  id: number;
  numero: string;
  total: string;
  pagado: string;
  saldo: string;
  vuelto: string;
};

/**
 * Emite una venta: valida stock y precios, descuenta stock (kardex), registra pagos
 * y asigna el correlativo de la boleta. Todo o nada.
 */
export async function crearVenta(d: VentaOutput, ctx: Contexto): Promise<VentaEmitida> {
  return prisma.$transaction(
    async (tx) => {
      if (d.clienteId) {
        const cliente = await tx.cliente.findUnique({ where: { id: d.clienteId }, select: { activo: true } });
        if (!cliente?.activo) throw new AppError("El cliente no existe o está desactivado.");
      }

      // ── Pagos ──
      const metodos = await tx.metodoPago.findMany({ where: { id: { in: d.pagos.map((p) => p.metodoPagoId) } } });
      let pagado = new D(0);
      let vuelto = new D(0);
      for (const p of d.pagos) {
        validarPago(
          metodos.find((m) => m.id === p.metodoPagoId),
          p,
        );
        pagado = pagado.add(p.monto);
        if (p.montoRecibido !== null) vuelto = vuelto.add(new D(p.montoRecibido).sub(p.monto));
      }

      // ── Productos (bloqueados en orden de id para evitar bloqueos cruzados entre ventas) ──
      const items = [...d.items].sort((a, b) => a.presentacionId - b.presentacionId);
      let totalLista = new D(0);
      let total = new D(0);
      const lineas: {
        presentacionId: number;
        descripcion: string;
        cantidad: number;
        precioLista: Prisma.Decimal;
        precioUnitario: Prisma.Decimal;
        costoUnitario: Prisma.Decimal;
        subtotal: Prisma.Decimal;
        stockAnterior: number;
      }[] = [];
      const bajoMinimo: { codigo: string; precio: string; minimo: string }[] = [];

      for (const it of items) {
        const actual = await bloquearPresentacion(tx, it.presentacionId);
        const pres = await tx.presentacion.findUniqueOrThrow({
          where: { id: it.presentacionId },
          select: {
            codigo: true,
            nombre: true,
            activo: true,
            precioVenta: true,
            precioMinimo: true,
            producto: { select: { nombre: true, activo: true } },
          },
        });
        if (!pres.activo || !pres.producto.activo) throw new AppError(`"${actual.nombre}" está desactivado.`);
        if (actual.stock < it.cantidad) {
          throw new AppError(`Stock insuficiente de "${actual.nombre}": hay ${actual.stock} y se quieren vender ${it.cantidad}.`);
        }

        const precio = new D(it.precioUnitario);
        if (precio.lt(pres.precioMinimo)) {
          if (!ctx.permitirBajoMinimo) {
            throw new AppError(
              `El precio de "${actual.nombre}" (S/ ${precio.toFixed(2)}) no puede ser menor al mínimo de S/ ${pres.precioMinimo.toFixed(2)}.`,
            );
          }
          bajoMinimo.push({ codigo: pres.codigo, precio: precio.toFixed(2), minimo: pres.precioMinimo.toFixed(2) });
        }

        const subtotal = precio.mul(it.cantidad).toDecimalPlaces(2);
        totalLista = totalLista.add(pres.precioVenta.mul(it.cantidad));
        total = total.add(subtotal);
        lineas.push({
          presentacionId: it.presentacionId,
          descripcion: pres.nombre === "Estándar" ? pres.producto.nombre : `${pres.producto.nombre} — ${pres.nombre}`,
          cantidad: it.cantidad,
          precioLista: pres.precioVenta,
          precioUnitario: precio,
          costoUnitario: actual.costoPromedio,
          subtotal,
          stockAnterior: actual.stock,
        });
      }
      totalLista = totalLista.toDecimalPlaces(2);
      total = total.toDecimalPlaces(2);

      if (pagado.gt(total)) {
        throw new AppError(
          `Los pagos (S/ ${pagado.toFixed(2)}) superan el total (S/ ${total.toFixed(2)}). Para el vuelto usa "recibido" en el pago en efectivo.`,
        );
      }
      const saldo = total.sub(pagado);
      if (!d.clienteId && (saldo.gt(0) || !d.entregado)) {
        throw new AppError("Para dejar saldo pendiente o entregar después, selecciona o registra al cliente.");
      }

      // ── Venta ──
      const { serie, numero } = await siguienteNumero(tx, "BOLETA");
      const numeroTexto = formatearNumero(serie, numero);
      const ahora = new Date();
      const venta = await tx.venta.create({
        data: {
          tipo: "VENTA",
          estado: "EMITIDA",
          serie,
          numero,
          fechaEmision: ahora,
          clienteId: d.clienteId,
          vendedorId: ctx.usuarioId,
          totalLista,
          descuento: totalLista.sub(total),
          total,
          montoPagado: pagado,
          saldo,
          estadoPago: estadoPagoDe(total.toString(), pagado.toString()),
          estadoEntrega: d.entregado ? "ENTREGADO" : "PENDIENTE",
          fechaEntrega: d.entregado ? ahora : null,
          entregadoPorId: d.entregado ? ctx.usuarioId : null,
          observaciones: d.observaciones,
          detalles: {
            create: lineas.map((l) => ({
              tipoItem: "PRODUCTO" as const,
              presentacionId: l.presentacionId,
              descripcion: l.descripcion,
              cantidad: l.cantidad,
              precioLista: l.precioLista,
              precioUnitario: l.precioUnitario,
              costoUnitario: l.costoUnitario,
              subtotal: l.subtotal,
            })),
          },
          pagos: {
            create: d.pagos.map((p) => ({
              metodoPagoId: p.metodoPagoId,
              monto: p.monto,
              montoRecibido: p.montoRecibido,
              referencia: p.referencia,
              fecha: ahora,
              usuarioId: ctx.usuarioId,
            })),
          },
        },
      });

      // ── Stock y kardex ──
      for (const l of lineas) {
        const stockNuevo = l.stockAnterior - l.cantidad;
        await tx.presentacion.update({ where: { id: l.presentacionId }, data: { stock: stockNuevo } });
        await tx.movimientoInventario.create({
          data: {
            presentacionId: l.presentacionId,
            tipo: "VENTA",
            cantidad: -l.cantidad,
            stockAnterior: l.stockAnterior,
            stockNuevo,
            costoUnitario: l.costoUnitario,
            ventaId: venta.id,
            usuarioId: ctx.usuarioId,
            nota: `Venta ${numeroTexto}`,
          },
        });
      }

      if (bajoMinimo.length) {
        await registrarAuditoria(
          { usuarioId: ctx.usuarioId, accion: "VENTA_BAJO_MINIMO", entidad: "venta", entidadId: venta.id, datos: bajoMinimo },
          tx,
        );
      }

      return {
        id: venta.id,
        numero: numeroTexto,
        total: total.toFixed(2),
        pagado: pagado.toFixed(2),
        saldo: saldo.toFixed(2),
        vuelto: vuelto.toFixed(2),
      };
    },
    OPCIONES_TX,
  );
}

/** Cobra (todo o parte del) saldo pendiente de una venta. */
export async function registrarCobro(d: CobroOutput, usuarioId: string) {
  return prisma.$transaction(async (tx) => {
    const venta = await bloquearVenta(tx, d.ventaId);
    if (venta.estado === "ANULADA") throw new AppError("No se puede cobrar una venta anulada.");

    validarPago(await tx.metodoPago.findUnique({ where: { id: d.metodoPagoId } }), d);
    const monto = new D(d.monto);
    if (monto.gt(venta.saldo)) {
      throw new AppError(
        `El monto supera el saldo pendiente (S/ ${venta.saldo.toFixed(2)}). Para el vuelto usa "recibido" en el pago en efectivo.`,
      );
    }

    const montoPagado = venta.montoPagado.add(monto);
    const saldo = venta.total.sub(montoPagado);
    await tx.pago.create({
      data: {
        ventaId: venta.id,
        metodoPagoId: d.metodoPagoId,
        monto,
        montoRecibido: d.montoRecibido,
        referencia: d.referencia,
        usuarioId,
      },
    });
    await tx.venta.update({
      where: { id: venta.id },
      data: { montoPagado, saldo, estadoPago: estadoPagoDe(venta.total.toString(), montoPagado.toString()) },
    });
    return {
      numero: venta.numeroTexto,
      saldo: saldo.toFixed(2),
      vuelto: d.montoRecibido === null ? "0.00" : new D(d.montoRecibido).sub(monto).toFixed(2),
    };
  }, OPCIONES_TX);
}

/** Registra que el cliente recogió el producto. */
export async function marcarEntregada(ventaId: number, usuarioId: string) {
  return prisma.$transaction(async (tx) => {
    const venta = await bloquearVenta(tx, ventaId);
    if (venta.estado !== "EMITIDA") throw new AppError("Solo se pueden entregar ventas emitidas.");
    if (venta.estadoEntrega === "ENTREGADO") throw new AppError("La venta ya fue entregada.");
    await tx.venta.update({
      where: { id: ventaId },
      data: { estadoEntrega: "ENTREGADO", fechaEntrega: new Date(), entregadoPorId: usuarioId },
    });
    return { numero: venta.numeroTexto };
  }, OPCIONES_TX);
}

/**
 * Cambia el cliente de la venta (o la pasa a Cliente general). Sirve para corregirlo
 * o para poder dejar saldo pendiente. Queda auditado.
 */
export async function cambiarClienteVenta(ventaId: number, clienteId: number | null, usuarioId: string) {
  return prisma.$transaction(async (tx) => {
    const venta = await bloquearVenta(tx, ventaId);
    if (venta.estado === "ANULADA") throw new AppError("La venta está anulada.");
    if (venta.clienteId === clienteId) return { numero: venta.numeroTexto };
    if (clienteId) {
      const cliente = await tx.cliente.findUnique({ where: { id: clienteId }, select: { activo: true } });
      if (!cliente?.activo) throw new AppError("El cliente no existe o está desactivado.");
    } else if (venta.saldo.gt(0) || venta.estadoEntrega === "PENDIENTE") {
      throw new AppError("La venta tiene saldo o entrega pendiente: el cliente es obligatorio.");
    }
    await tx.venta.update({ where: { id: ventaId }, data: { clienteId } });
    await registrarAuditoria(
      {
        usuarioId,
        accion: "CAMBIAR_CLIENTE_VENTA",
        entidad: "venta",
        entidadId: ventaId,
        datos: { numero: venta.numeroTexto, anterior: venta.clienteId, nuevo: clienteId },
      },
      tx,
    );
    return { numero: venta.numeroTexto };
  }, OPCIONES_TX);
}

/** Anula un pago (ej. método equivocado). El saldo de la venta vuelve a subir. */
export async function anularPagoVenta(pagoId: number, motivo: string, usuarioId: string) {
  return prisma.$transaction(async (tx) => {
    const pago = await tx.pago.findUnique({ where: { id: pagoId } });
    if (!pago) throw new AppError("El pago no existe.");
    const venta = await bloquearVenta(tx, pago.ventaId);
    if (venta.estado === "ANULADA") throw new AppError("La venta está anulada.");
    // Se vuelve a leer tras bloquear la venta por si otro usuario lo anuló al mismo tiempo
    if (venta.pagos.find((p) => p.id === pagoId)?.anulado) throw new AppError("El pago ya estaba anulado.");

    const montoPagado = venta.montoPagado.sub(pago.monto);
    const saldo = venta.total.sub(montoPagado);
    if (saldo.gt(0) && !venta.clienteId) {
      throw new AppError(
        "La venta es de Cliente general y quedaría con saldo pendiente. Asigna primero un cliente a la venta.",
      );
    }

    await tx.pago.update({
      where: { id: pagoId },
      data: { anulado: true, anuladoPorId: usuarioId, fechaAnulacion: new Date(), motivoAnulacion: motivo },
    });
    await tx.venta.update({
      where: { id: venta.id },
      data: { montoPagado, saldo, estadoPago: estadoPagoDe(venta.total.toString(), montoPagado.toString()) },
    });
    await registrarAuditoria(
      {
        usuarioId,
        accion: "ANULAR_PAGO_VENTA",
        entidad: "venta",
        entidadId: venta.id,
        datos: { numero: venta.numeroTexto, pagoId, monto: pago.monto.toFixed(2), motivo },
      },
      tx,
    );
    return { ventaId: venta.id, saldo: saldo.toFixed(2) };
  }, OPCIONES_TX);
}

/**
 * Anula la venta: devuelve el stock (kardex ANULACION_VENTA, al costo con que salió),
 * anula los pagos vigentes y lo audita. Los montos de la venta se conservan como historial.
 */
export async function anularVenta(ventaId: number, motivo: string, usuarioId: string) {
  return prisma.$transaction(async (tx) => {
    const venta = await bloquearVenta(tx, ventaId);
    if (venta.estado === "ANULADA") throw new AppError("La venta ya estaba anulada.");
    if (venta.tipo !== "VENTA") throw new AppError("La anulación de boletas de órdenes de servicio aún no está disponible.");

    // Bloqueo en orden de id (igual que al vender) para evitar bloqueos cruzados
    const lineas = venta.detalles
      .filter((l) => l.tipoItem === "PRODUCTO" && l.presentacionId !== null)
      .sort((a, b) => a.presentacionId! - b.presentacionId! || a.id - b.id);
    for (const l of lineas) {
      const actual = await bloquearPresentacion(tx, l.presentacionId!);
      const stockNuevo = actual.stock + l.cantidad;
      await tx.presentacion.update({
        where: { id: l.presentacionId! },
        data: {
          stock: stockNuevo,
          costoPromedio: nuevoCostoPromedio(actual.stock, actual.costoPromedio, l.cantidad, l.costoUnitario),
        },
      });
      await tx.movimientoInventario.create({
        data: {
          presentacionId: l.presentacionId!,
          tipo: "ANULACION_VENTA",
          cantidad: l.cantidad,
          stockAnterior: actual.stock,
          stockNuevo,
          costoUnitario: l.costoUnitario,
          ventaId,
          usuarioId,
          nota: `Anulación ${venta.numeroTexto}`,
        },
      });
    }

    const ahora = new Date();
    const vigentes = venta.pagos.filter((p) => !p.anulado);
    await tx.pago.updateMany({
      where: { id: { in: vigentes.map((p) => p.id) } },
      data: { anulado: true, anuladoPorId: usuarioId, fechaAnulacion: ahora, motivoAnulacion: `Venta anulada: ${motivo}` },
    });
    await tx.venta.update({
      where: { id: ventaId },
      data: { estado: "ANULADA", anuladoPorId: usuarioId, fechaAnulacion: ahora, motivoAnulacion: motivo },
    });

    const devolver = vigentes.reduce((s, p) => s.add(p.monto), new D(0)).toFixed(2);
    await registrarAuditoria(
      {
        usuarioId,
        accion: "ANULAR_VENTA",
        entidad: "venta",
        entidadId: ventaId,
        datos: { numero: venta.numeroTexto, total: venta.total.toFixed(2), devolver, motivo },
      },
      tx,
    );
    return { numero: venta.numeroTexto, devolver };
  }, OPCIONES_TX);
}
