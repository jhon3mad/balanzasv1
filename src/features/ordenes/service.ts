// Órdenes de servicio (transaccional). La usan las Server Actions.
// Una orden es una Venta de tipo SERVICIO (estado ABIERTA hasta emitir la boleta) + OrdenServicio 1:1.
import { Prisma } from "../../../generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { AppError } from "@/lib/errors";
import { registrarAuditoria } from "@/lib/auditoria";
import { formatearNumero, siguienteNumero } from "@/lib/correlativo";
import { fechaLimaADate, fechaInput } from "@/lib/dates";
import { estadoPagoDe } from "@/lib/estados";
import { bloquearPresentacion, nuevoCostoPromedio } from "@/lib/stock";
import { validarPago } from "@/features/ventas/service";
import { ESTADO_ORDEN_LABELS, esFinal, estadosPermitidos } from "./constants";
import type { CambiarEstadoOrdenOutput, EntregarOrdenOutput, ItemOrdenOutput, OrdenOutput } from "./schemas";

type Tx = Prisma.TransactionClient;
const D = Prisma.Decimal;
const OPCIONES_TX = { timeout: 20_000 };

/** Roles que pueden figurar como técnico. */
export const ROLES_TECNICO = ["admin", "vendedor"];

async function validarCliente(tx: Tx, clienteId: number) {
  const cliente = await tx.cliente.findUnique({ where: { id: clienteId }, select: { activo: true } });
  if (!cliente?.activo) throw new AppError("El cliente no existe o está desactivado.");
}

async function validarTecnico(tx: Tx, tecnicoId: string) {
  const u = await tx.user.findUnique({ where: { id: tecnicoId }, select: { role: true, banned: true, name: true } });
  if (!u || u.banned || !ROLES_TECNICO.includes(u.role ?? "")) {
    throw new AppError("El técnico seleccionado no existe o está desactivado.");
  }
  return u.name;
}

/**
 * Bloquea la orden y su venta (en ese orden, siempre) para evitar cambios simultáneos:
 * estado, edición, ítems, adelantos, entrega o cancelación.
 */
async function bloquearOrden(tx: Tx, ordenId: number) {
  const filas = await tx.$queryRaw<{ ventaId: number }[]>`
    SELECT "ventaId" FROM "orden_servicio" WHERE id = ${ordenId} FOR UPDATE`;
  if (!filas[0]) throw new AppError("La orden de servicio no existe.");
  await tx.$queryRaw`SELECT id FROM "venta" WHERE id = ${filas[0].ventaId} FOR UPDATE`;
  const orden = await tx.ordenServicio.findUniqueOrThrow({
    where: { id: ordenId },
    include: {
      tecnico: { select: { name: true } },
      venta: {
        select: {
          id: true,
          clienteId: true,
          total: true,
          montoPagado: true,
          saldo: true,
          detalles: { select: { id: true } },
        },
      },
    },
  });
  return { ...orden, numeroTexto: formatearNumero(orden.serie, orden.numero) };
}

/** Recalcula totales y saldo de la venta de la orden a partir de sus líneas. */
async function recalcularTotales(tx: Tx, ventaId: number, montoPagado: Prisma.Decimal) {
  const lineas = await tx.ventaDetalle.findMany({ where: { ventaId }, select: { cantidad: true, precioLista: true, subtotal: true } });
  const total = lineas.reduce((s, l) => s.add(l.subtotal), new D(0)).toDecimalPlaces(2);
  const totalLista = lineas.reduce((s, l) => s.add(l.precioLista.mul(l.cantidad)), new D(0)).toDecimalPlaces(2);
  if (montoPagado.gt(total)) {
    throw new AppError(
      `Los adelantos (S/ ${montoPagado.toFixed(2)}) superarían el total de la orden (S/ ${total.toFixed(2)}). Anula primero algún adelanto.`,
    );
  }
  await tx.venta.update({
    where: { id: ventaId },
    data: {
      total,
      totalLista,
      descuento: totalLista.sub(total),
      saldo: total.sub(montoPagado),
      estadoPago: total.eq(0) ? "PENDIENTE" : estadoPagoDe(total.toString(), montoPagado.toString()),
    },
  });
  return { total, saldo: total.sub(montoPagado) };
}

function datosOrden(d: OrdenOutput) {
  return {
    equipo: d.equipo,
    marca: d.marca,
    modelo: d.modelo,
    numeroSerie: d.numeroSerie,
    accesorios: d.accesorios,
    fallaReportada: d.fallaReportada,
    diagnostico: d.diagnostico,
    presupuesto: d.presupuesto,
    tecnicoId: d.tecnicoId,
    fechaPrometida: d.fechaPrometida ? fechaLimaADate(d.fechaPrometida) : null,
    garantiaDias: d.garantiaDias,
  };
}

/** Recepción del equipo: crea la venta abierta, la orden con su número y el primer estado. */
export async function crearOrden(d: OrdenOutput, usuarioId: string) {
  return prisma.$transaction(async (tx) => {
    await validarCliente(tx, d.clienteId);
    if (d.tecnicoId) await validarTecnico(tx, d.tecnicoId);

    const { serie, numero } = await siguienteNumero(tx, "ORDEN_SERVICIO");
    const venta = await tx.venta.create({
      data: {
        tipo: "SERVICIO",
        estado: "ABIERTA",
        clienteId: d.clienteId,
        vendedorId: usuarioId,
        totalLista: 0,
        total: 0,
        saldo: 0,
        estadoPago: "PENDIENTE",
        estadoEntrega: "PENDIENTE",
        observaciones: d.observaciones,
      },
    });
    const orden = await tx.ordenServicio.create({
      data: {
        serie,
        numero,
        ventaId: venta.id,
        estado: "RECIBIDO",
        ...datosOrden(d),
        historial: { create: { estadoNuevo: "RECIBIDO", nota: "Equipo recibido", usuarioId } },
      },
    });
    return { id: orden.id, numero: formatearNumero(serie, numero) };
  }, OPCIONES_TX);
}

/** Edita los datos de una orden en curso. Los cambios importantes quedan en el historial. */
export async function actualizarOrden(id: number, d: OrdenOutput, usuarioId: string) {
  return prisma.$transaction(async (tx) => {
    const actual = await bloquearOrden(tx, id);
    if (esFinal(actual.estado)) throw new AppError("La orden ya fue entregada o cancelada; no se puede editar.");
    if (d.clienteId !== actual.venta.clienteId) await validarCliente(tx, d.clienteId);

    const cambios: string[] = [];
    if (d.tecnicoId !== actual.tecnicoId) {
      cambios.push(d.tecnicoId ? `Técnico: ${await validarTecnico(tx, d.tecnicoId)}` : "Sin técnico asignado");
    }
    const presupuestoAntes = actual.presupuesto?.toFixed(2) ?? null;
    const presupuestoNuevo = d.presupuesto === null ? null : Number(d.presupuesto).toFixed(2);
    if (presupuestoNuevo !== presupuestoAntes) {
      cambios.push(presupuestoNuevo ? `Presupuesto: S/ ${presupuestoNuevo}` : "Presupuesto retirado");
    }
    if ((d.diagnostico ?? null) !== (actual.diagnostico ?? null)) cambios.push("Diagnóstico actualizado");
    const prometidaAntes = actual.fechaPrometida ? fechaInput(actual.fechaPrometida) : null;
    if (d.fechaPrometida !== prometidaAntes) {
      cambios.push(d.fechaPrometida ? `Fecha prometida: ${d.fechaPrometida.split("-").reverse().join("/")}` : "Sin fecha prometida");
    }
    if (d.clienteId !== actual.venta.clienteId) cambios.push("Cliente cambiado");

    const datos = datosOrden(d);
    // Si la fecha prometida no cambió se conserva la hora guardada
    if (d.fechaPrometida === prometidaAntes) datos.fechaPrometida = actual.fechaPrometida;

    await tx.venta.update({
      where: { id: actual.venta.id },
      data: { clienteId: d.clienteId, observaciones: d.observaciones },
    });
    await tx.ordenServicio.update({ where: { id }, data: datos });
    if (cambios.length) {
      await tx.ordenServicioHistorial.create({
        data: { ordenId: id, estadoAnterior: actual.estado, estadoNuevo: actual.estado, nota: cambios.join(" · "), usuarioId },
      });
    }
    return { id, numero: actual.numeroTexto };
  }, OPCIONES_TX);
}

/** Avanza (o retrocede un paso) en el flujo del taller y lo registra en el historial. */
export async function cambiarEstadoOrden(d: CambiarEstadoOrdenOutput, usuarioId: string) {
  return prisma.$transaction(async (tx) => {
    const orden = await bloquearOrden(tx, d.ordenId);
    if (esFinal(orden.estado)) throw new AppError("La orden ya fue entregada o cancelada.");
    if (orden.estado === d.estado) throw new AppError(`La orden ya está "${ESTADO_ORDEN_LABELS[d.estado]}".`);
    if (!estadosPermitidos(orden.estado).includes(d.estado)) {
      throw new AppError(
        `No se puede pasar de "${ESTADO_ORDEN_LABELS[orden.estado]}" a "${ESTADO_ORDEN_LABELS[d.estado]}": solo se puede retroceder un paso.`,
      );
    }

    await tx.ordenServicio.update({
      where: { id: d.ordenId },
      data: { estado: d.estado, fechaListo: d.estado === "LISTO" ? new Date() : null },
    });
    await tx.ordenServicioHistorial.create({
      data: { ordenId: d.ordenId, estadoAnterior: orden.estado, estadoNuevo: d.estado, nota: d.nota, usuarioId },
    });
    return { numero: orden.numeroTexto };
  }, OPCIONES_TX);
}

/**
 * Cancela la orden (el cliente desiste o no hay reparación). Solo si aún no tiene
 * servicios, repuestos ni adelantos. La venta abierta queda anulada.
 */
export async function cancelarOrden(ordenId: number, motivo: string, usuarioId: string) {
  return prisma.$transaction(async (tx) => {
    const orden = await bloquearOrden(tx, ordenId);
    if (esFinal(orden.estado)) throw new AppError("La orden ya fue entregada o cancelada.");
    if (orden.venta.montoPagado.gt(0)) throw new AppError("La orden tiene adelantos. Anúlalos antes de cancelarla.");
    if (orden.venta.detalles.length > 0) {
      throw new AppError("La orden tiene servicios o repuestos. Quítalos antes de cancelarla.");
    }

    const ahora = new Date();
    await tx.ordenServicio.update({ where: { id: ordenId }, data: { estado: "CANCELADO" } });
    await tx.venta.update({
      where: { id: orden.venta.id },
      data: { estado: "ANULADA", anuladoPorId: usuarioId, fechaAnulacion: ahora, motivoAnulacion: motivo },
    });
    await tx.ordenServicioHistorial.create({
      data: { ordenId, estadoAnterior: orden.estado, estadoNuevo: "CANCELADO", nota: motivo, usuarioId, fecha: ahora },
    });
    await registrarAuditoria(
      { usuarioId, accion: "CANCELAR_ORDEN", entidad: "orden_servicio", entidadId: ordenId, datos: { numero: orden.numeroTexto, motivo } },
      tx,
    );
    return { numero: orden.numeroTexto };
  }, OPCIONES_TX);
}

type ContextoItem = {
  usuarioId: string;
  /** Rol con permiso venta:precioBajoMinimo */
  permitirBajoMinimo: boolean;
};

/**
 * Agrega un servicio o un repuesto a la orden. El repuesto descuenta stock en el acto
 * (kardex VENTA), con las mismas reglas de precio mínimo que el punto de venta.
 */
export async function agregarItemOrden(d: ItemOrdenOutput, ctx: ContextoItem) {
  return prisma.$transaction(async (tx) => {
    const orden = await bloquearOrden(tx, d.ordenId);
    if (esFinal(orden.estado)) throw new AppError("La orden ya fue entregada o cancelada.");
    const precio = new D(d.precioUnitario);
    const subtotal = precio.mul(d.cantidad).toDecimalPlaces(2);

    if (d.tipo === "SERVICIO") {
      const servicio = await tx.servicio.findUnique({ where: { id: d.servicioId! } });
      if (!servicio?.activo) throw new AppError("El servicio no existe o está desactivado.");
      await tx.ventaDetalle.create({
        data: {
          ventaId: orden.venta.id,
          tipoItem: "SERVICIO",
          servicioId: servicio.id,
          descripcion: servicio.nombre,
          cantidad: d.cantidad,
          precioLista: servicio.precioReferencial,
          precioUnitario: precio,
          costoUnitario: 0,
          subtotal,
        },
      });
    } else {
      const actual = await bloquearPresentacion(tx, d.presentacionId!);
      const pres = await tx.presentacion.findUniqueOrThrow({
        where: { id: d.presentacionId! },
        select: { codigo: true, nombre: true, activo: true, precioVenta: true, precioMinimo: true, producto: { select: { nombre: true, activo: true } } },
      });
      if (!pres.activo || !pres.producto.activo) throw new AppError(`"${actual.nombre}" está desactivado.`);
      if (actual.stock < d.cantidad) {
        throw new AppError(`Stock insuficiente de "${actual.nombre}": hay ${actual.stock} y se quieren usar ${d.cantidad}.`);
      }
      if (precio.lt(pres.precioMinimo)) {
        if (!ctx.permitirBajoMinimo) {
          throw new AppError(
            `El precio de "${actual.nombre}" (S/ ${precio.toFixed(2)}) no puede ser menor al mínimo de S/ ${pres.precioMinimo.toFixed(2)}.`,
          );
        }
        await registrarAuditoria(
          {
            usuarioId: ctx.usuarioId,
            accion: "VENTA_BAJO_MINIMO",
            entidad: "venta",
            entidadId: orden.venta.id,
            datos: [{ codigo: pres.codigo, precio: precio.toFixed(2), minimo: pres.precioMinimo.toFixed(2), orden: orden.numeroTexto }],
          },
          tx,
        );
      }

      const stockNuevo = actual.stock - d.cantidad;
      await tx.presentacion.update({ where: { id: d.presentacionId! }, data: { stock: stockNuevo } });
      await tx.ventaDetalle.create({
        data: {
          ventaId: orden.venta.id,
          tipoItem: "PRODUCTO",
          presentacionId: d.presentacionId,
          descripcion: pres.nombre === "Estándar" ? pres.producto.nombre : `${pres.producto.nombre} — ${pres.nombre}`,
          cantidad: d.cantidad,
          precioLista: pres.precioVenta,
          precioUnitario: precio,
          costoUnitario: actual.costoPromedio,
          subtotal,
        },
      });
      await tx.movimientoInventario.create({
        data: {
          presentacionId: d.presentacionId!,
          tipo: "VENTA",
          cantidad: -d.cantidad,
          stockAnterior: actual.stock,
          stockNuevo,
          costoUnitario: actual.costoPromedio,
          ventaId: orden.venta.id,
          usuarioId: ctx.usuarioId,
          nota: `Repuesto ${orden.numeroTexto}`,
        },
      });
    }

    const { total } = await recalcularTotales(tx, orden.venta.id, orden.venta.montoPagado);
    return { numero: orden.numeroTexto, total: total.toFixed(2) };
  }, OPCIONES_TX);
}

/** Quita una línea de la orden. Si es repuesto, vuelve al stock al costo con que salió. */
export async function quitarItemOrden(detalleId: number, usuarioId: string) {
  return prisma.$transaction(async (tx) => {
    const linea = await tx.ventaDetalle.findUnique({
      where: { id: detalleId },
      select: { venta: { select: { ordenServicio: { select: { id: true } } } } },
    });
    const ordenId = linea?.venta.ordenServicio?.id;
    if (!ordenId) throw new AppError("La línea no existe o no pertenece a una orden de servicio.");
    const orden = await bloquearOrden(tx, ordenId);
    if (esFinal(orden.estado)) throw new AppError("La orden ya fue entregada o cancelada.");
    // Se vuelve a leer con la orden bloqueada (otro usuario pudo quitarla)
    const det = await tx.ventaDetalle.findUnique({ where: { id: detalleId } });
    if (!det) throw new AppError("La línea ya fue quitada.");

    await tx.ventaDetalle.delete({ where: { id: detalleId } });
    // Primero se valida que los adelantos no superen el nuevo total, luego se devuelve el stock
    const { total } = await recalcularTotales(tx, orden.venta.id, orden.venta.montoPagado);

    if (det.tipoItem === "PRODUCTO" && det.presentacionId) {
      const actual = await bloquearPresentacion(tx, det.presentacionId);
      const stockNuevo = actual.stock + det.cantidad;
      await tx.presentacion.update({
        where: { id: det.presentacionId },
        data: {
          stock: stockNuevo,
          costoPromedio: nuevoCostoPromedio(actual.stock, actual.costoPromedio, det.cantidad, det.costoUnitario),
        },
      });
      await tx.movimientoInventario.create({
        data: {
          presentacionId: det.presentacionId,
          tipo: "ANULACION_VENTA",
          cantidad: det.cantidad,
          stockAnterior: actual.stock,
          stockNuevo,
          costoUnitario: det.costoUnitario,
          ventaId: orden.venta.id,
          usuarioId,
          nota: `Repuesto retirado de ${orden.numeroTexto}`,
        },
      });
    }
    return { ordenId, numero: orden.numeroTexto, total: total.toFixed(2) };
  }, OPCIONES_TX);
}

/**
 * Entrega el equipo: emite la boleta (B001) sobre la venta de la orden, cobra lo que
 * se pague en el acto y deja el resto como saldo del cliente (cuentas por cobrar).
 */
export async function entregarOrden(d: EntregarOrdenOutput, usuarioId: string) {
  return prisma.$transaction(async (tx) => {
    const orden = await bloquearOrden(tx, d.ordenId);
    if (esFinal(orden.estado)) throw new AppError("La orden ya fue entregada o cancelada.");
    if (orden.venta.detalles.length === 0) {
      throw new AppError(
        "Agrega al menos un servicio (por ejemplo, el diagnóstico) antes de entregar. Si no se cobra nada, cancela la orden.",
      );
    }

    let montoPagado = orden.venta.montoPagado;
    let vuelto = new D(0);
    const ahora = new Date();
    if (d.pago) {
      validarPago(await tx.metodoPago.findUnique({ where: { id: d.pago.metodoPagoId } }), d.pago);
      const monto = new D(d.pago.monto);
      if (monto.gt(orden.venta.saldo)) {
        throw new AppError(`El pago supera el saldo pendiente (S/ ${orden.venta.saldo.toFixed(2)}).`);
      }
      await tx.pago.create({
        data: {
          ventaId: orden.venta.id,
          metodoPagoId: d.pago.metodoPagoId,
          monto,
          montoRecibido: d.pago.montoRecibido,
          referencia: d.pago.referencia,
          fecha: ahora,
          usuarioId,
        },
      });
      montoPagado = montoPagado.add(monto);
      if (d.pago.montoRecibido !== null) vuelto = new D(d.pago.montoRecibido).sub(monto);
    }

    const { serie, numero } = await siguienteNumero(tx, "BOLETA");
    const boleta = formatearNumero(serie, numero);
    const saldo = orden.venta.total.sub(montoPagado);
    await tx.venta.update({
      where: { id: orden.venta.id },
      data: {
        estado: "EMITIDA",
        serie,
        numero,
        fechaEmision: ahora,
        montoPagado,
        saldo,
        estadoPago: estadoPagoDe(orden.venta.total.toString(), montoPagado.toString()),
        estadoEntrega: "ENTREGADO",
        fechaEntrega: ahora,
        entregadoPorId: usuarioId,
      },
    });
    await tx.ordenServicio.update({ where: { id: d.ordenId }, data: { estado: "ENTREGADO", fechaEntrega: ahora } });
    await tx.ordenServicioHistorial.create({
      data: {
        ordenId: d.ordenId,
        estadoAnterior: orden.estado,
        estadoNuevo: "ENTREGADO",
        nota: saldo.gt(0) ? `Boleta ${boleta} · saldo pendiente S/ ${saldo.toFixed(2)}` : `Boleta ${boleta}`,
        usuarioId,
        fecha: ahora,
      },
    });
    return {
      numero: orden.numeroTexto,
      boleta,
      ventaId: orden.venta.id,
      saldo: saldo.toFixed(2),
      vuelto: vuelto.toFixed(2),
    };
  }, OPCIONES_TX);
}
