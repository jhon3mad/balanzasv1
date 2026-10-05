// Caja: turnos con fondo inicial y arqueo del efectivo al cerrar. La usan las Server Actions.
// El efectivo esperado se calcula por el periodo de la caja (apertura → cierre):
//   fondo inicial + cobros en efectivo − reembolsos en efectivo + ingresos − retiros.
import { Prisma } from "../../../generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { AppError } from "@/lib/errors";
import { registrarAuditoria } from "@/lib/auditoria";
import type { CerrarCajaOutput, MovimientoCajaOutput } from "./schemas";

type Db = Prisma.TransactionClient | typeof prisma;
const D = Prisma.Decimal;
const OPCIONES_TX = { timeout: 20_000 };

export type MetodoCaja = {
  metodo: string;
  esEfectivo: boolean;
  pagos: number;
  cobrado: string;
  reembolsado: string;
  neto: string;
};

/** Resumen de una caja. Se guarda tal cual (JSON) al cerrarla. */
export type ResumenCaja = {
  montoInicial: string;
  porMetodo: MetodoCaja[];
  efectivoCobrado: string;
  efectivoReembolsado: string;
  ingresos: string;
  egresos: string;
  /** Todo lo cobrado en el turno (todos los métodos, sin reembolsos) */
  totalNeto: string;
  esperado: string;
};

/** Calcula lo movido en la caja entre su apertura y `hasta`. */
export async function calcularCaja(
  db: Db,
  caja: { id: number; montoInicial: Prisma.Decimal; fechaApertura: Date },
  hasta: Date,
): Promise<ResumenCaja> {
  const desde = caja.fechaApertura;
  const [metodos, movimientos] = await Promise.all([
    db.$queryRaw<{ metodo: string; esEfectivo: boolean; pagos: number; cobrado: Prisma.Decimal; reembolsado: Prisma.Decimal }[]>`
      SELECT m.nombre AS metodo, m."esEfectivo", COALESCE(p.pagos, 0)::int AS pagos,
             COALESCE(p.monto, 0) AS cobrado, COALESCE(r.monto, 0) AS reembolsado
      FROM "metodo_pago" m
      LEFT JOIN (
        SELECT "metodoPagoId", COUNT(*) AS pagos, SUM(monto) AS monto FROM "pago"
        WHERE NOT anulado AND fecha >= ${desde} AND fecha < ${hasta} GROUP BY "metodoPagoId"
      ) p ON p."metodoPagoId" = m.id
      LEFT JOIN (
        SELECT "metodoPagoId", SUM("montoReembolso") AS monto FROM "devolucion"
        WHERE "montoReembolso" > 0 AND fecha >= ${desde} AND fecha < ${hasta} GROUP BY "metodoPagoId"
      ) r ON r."metodoPagoId" = m.id
      WHERE p.pagos IS NOT NULL OR r.monto IS NOT NULL
      ORDER BY m.orden, m.nombre`,
    db.movimientoCaja.groupBy({ by: ["tipo"], where: { cajaId: caja.id }, _sum: { monto: true } }),
  ]);

  const dec = (v: Prisma.Decimal | null | undefined) => new D(v?.toString() ?? 0);
  let efectivoCobrado = new D(0);
  let efectivoReembolsado = new D(0);
  let totalNeto = new D(0);
  const porMetodo: MetodoCaja[] = metodos.map((m) => {
    const cobrado = dec(m.cobrado);
    const reembolsado = dec(m.reembolsado);
    if (m.esEfectivo) {
      efectivoCobrado = efectivoCobrado.add(cobrado);
      efectivoReembolsado = efectivoReembolsado.add(reembolsado);
    }
    totalNeto = totalNeto.add(cobrado).sub(reembolsado);
    return {
      metodo: m.metodo,
      esEfectivo: m.esEfectivo,
      pagos: m.pagos,
      cobrado: cobrado.toFixed(2),
      reembolsado: reembolsado.toFixed(2),
      neto: cobrado.sub(reembolsado).toFixed(2),
    };
  });
  const ingresos = dec(movimientos.find((m) => m.tipo === "INGRESO")?._sum.monto);
  const egresos = dec(movimientos.find((m) => m.tipo === "EGRESO")?._sum.monto);
  const esperado = caja.montoInicial.add(efectivoCobrado).sub(efectivoReembolsado).add(ingresos).sub(egresos);

  return {
    montoInicial: caja.montoInicial.toFixed(2),
    porMetodo,
    efectivoCobrado: efectivoCobrado.toFixed(2),
    efectivoReembolsado: efectivoReembolsado.toFixed(2),
    ingresos: ingresos.toFixed(2),
    egresos: egresos.toFixed(2),
    totalNeto: totalNeto.toFixed(2),
    esperado: esperado.toFixed(2),
  };
}

/** Bloquea la caja abierta (si hay) para que dos personas no la cierren o muevan a la vez. */
async function bloquearCajaAbierta(tx: Prisma.TransactionClient) {
  const filas = await tx.$queryRaw<{ id: number }[]>`SELECT id FROM "caja" WHERE estado = 'ABIERTA' FOR UPDATE`;
  if (!filas[0]) throw new AppError("No hay una caja abierta.");
  return tx.caja.findUniqueOrThrow({ where: { id: filas[0].id } });
}

export async function abrirCaja(montoInicial: string, usuarioId: string) {
  return prisma.$transaction(async (tx) => {
    const abierta = await tx.caja.findFirst({ where: { estado: "ABIERTA" }, include: { abiertaPor: { select: { name: true } } } });
    if (abierta) throw new AppError(`Ya hay una caja abierta (la abrió ${abierta.abiertaPor.name}).`);
    // El índice único parcial de la BD impide dos cajas abiertas aunque dos usuarios abran a la vez
    const caja = await tx.caja.create({ data: { montoInicial, abiertaPorId: usuarioId } });
    return { id: caja.id };
  }, OPCIONES_TX);
}

/** Ingreso o retiro de efectivo que no es una venta. Un retiro no puede dejar la caja en negativo. */
export async function registrarMovimientoCaja(d: MovimientoCajaOutput, usuarioId: string) {
  return prisma.$transaction(async (tx) => {
    const caja = await bloquearCajaAbierta(tx);
    if (d.tipo === "EGRESO") {
      const { esperado } = await calcularCaja(tx, caja, new Date());
      if (new D(d.monto).gt(esperado)) {
        throw new AppError(`No puedes retirar más del efectivo que debería haber en caja (S/ ${esperado}).`);
      }
    }
    await tx.movimientoCaja.create({ data: { cajaId: caja.id, tipo: d.tipo, monto: d.monto, concepto: d.concepto, usuarioId } });
    return { cajaId: caja.id };
  }, OPCIONES_TX);
}

/** Cierra la caja con el arqueo: guarda lo esperado, lo contado y la diferencia. */
export async function cerrarCaja(d: CerrarCajaOutput, usuarioId: string) {
  return prisma.$transaction(async (tx) => {
    const caja = await bloquearCajaAbierta(tx);
    const ahora = new Date();
    const resumen = await calcularCaja(tx, caja, ahora);
    const contado = new D(d.efectivoContado);
    const diferencia = contado.sub(resumen.esperado);

    await tx.caja.update({
      where: { id: caja.id },
      data: {
        estado: "CERRADA",
        fechaCierre: ahora,
        cerradaPorId: usuarioId,
        efectivoEsperado: resumen.esperado,
        efectivoContado: contado,
        diferencia,
        resumen,
        observaciones: d.observaciones,
      },
    });
    if (!diferencia.eq(0)) {
      await registrarAuditoria(
        {
          usuarioId,
          accion: diferencia.gt(0) ? "CAJA_SOBRANTE" : "CAJA_FALTANTE",
          entidad: "caja",
          entidadId: caja.id,
          datos: { esperado: resumen.esperado, contado: contado.toFixed(2), diferencia: diferencia.toFixed(2) },
        },
        tx,
      );
    }
    return { id: caja.id, esperado: resumen.esperado, contado: contado.toFixed(2), diferencia: diferencia.toFixed(2) };
  }, OPCIONES_TX);
}
