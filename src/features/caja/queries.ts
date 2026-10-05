import "server-only";
import { prisma } from "@/lib/prisma";
import { decimalATexto } from "@/lib/money";
import { calcularCaja, type ResumenCaja } from "./service";
import type { TipoMovimientoCaja } from "./schemas";

export const PAGE_SIZE = 20;

export type MovimientoCajaDTO = { id: number; tipo: TipoMovimientoCaja; monto: string; concepto: string; usuario: string; fecha: string };

export type CajaDTO = {
  id: number;
  estado: "ABIERTA" | "CERRADA";
  fechaApertura: string;
  abiertaPor: string;
  fechaCierre: string | null;
  cerradaPor: string | null;
  efectivoContado: string | null;
  diferencia: string | null;
  observaciones: string | null;
  resumen: ResumenCaja;
  movimientos: MovimientoCajaDTO[];
};

const INCLUDE = {
  abiertaPor: { select: { name: true } },
  cerradaPor: { select: { name: true } },
  movimientos: { orderBy: { fecha: "asc" as const }, include: { usuario: { select: { name: true } } } },
};

async function aDTO(c: NonNullable<Awaited<ReturnType<typeof buscar>>>): Promise<CajaDTO> {
  // Abierta: se calcula en vivo. Cerrada: se usa la foto guardada al cerrar.
  const resumen = c.estado === "CERRADA" && c.resumen ? (c.resumen as unknown as ResumenCaja) : await calcularCaja(prisma, c, new Date());
  return {
    id: c.id,
    estado: c.estado,
    fechaApertura: c.fechaApertura.toISOString(),
    abiertaPor: c.abiertaPor.name,
    fechaCierre: c.fechaCierre?.toISOString() ?? null,
    cerradaPor: c.cerradaPor?.name ?? null,
    efectivoContado: decimalATexto(c.efectivoContado),
    diferencia: decimalATexto(c.diferencia),
    observaciones: c.observaciones,
    resumen,
    movimientos: c.movimientos.map((m) => ({
      id: m.id,
      tipo: m.tipo,
      monto: decimalATexto(m.monto) ?? "0.00",
      concepto: m.concepto,
      usuario: m.usuario.name,
      fecha: m.fecha.toISOString(),
    })),
  };
}

const buscar = (where: { id: number } | { estado: "ABIERTA" }) =>
  "id" in where
    ? prisma.caja.findUnique({ where, include: INCLUDE })
    : prisma.caja.findFirst({ where, include: INCLUDE });

export async function hayCajaAbierta(): Promise<boolean> {
  return (await prisma.caja.count({ where: { estado: "ABIERTA" } })) > 0;
}

/** La caja abierta ahora (con lo calculado hasta este momento), o null. */
export async function cajaAbierta(): Promise<CajaDTO | null> {
  const c = await buscar({ estado: "ABIERTA" });
  return c ? aDTO(c) : null;
}

export async function obtenerCaja(id: number): Promise<CajaDTO | null> {
  const c = await buscar({ id });
  return c ? aDTO(c) : null;
}

/** Último cierre, para sugerir el fondo de la siguiente apertura. */
export async function ultimoCierre() {
  const c = await prisma.caja.findFirst({
    where: { estado: "CERRADA" },
    orderBy: { fechaCierre: "desc" },
    select: { efectivoContado: true, fechaCierre: true },
  });
  return c ? { efectivoContado: decimalATexto(c.efectivoContado) ?? "0.00", fechaCierre: c.fechaCierre!.toISOString() } : null;
}

export type CajaListaDTO = {
  id: number;
  estado: "ABIERTA" | "CERRADA";
  fechaApertura: string;
  fechaCierre: string | null;
  abiertaPor: string;
  cerradaPor: string | null;
  montoInicial: string;
  esperado: string | null;
  contado: string | null;
  diferencia: string | null;
};

export async function listarCajas(page: number) {
  const [total, filas] = await Promise.all([
    prisma.caja.count(),
    prisma.caja.findMany({
      orderBy: { fechaApertura: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: { abiertaPor: { select: { name: true } }, cerradaPor: { select: { name: true } } },
    }),
  ]);
  const items: CajaListaDTO[] = filas.map((c) => ({
    id: c.id,
    estado: c.estado,
    fechaApertura: c.fechaApertura.toISOString(),
    fechaCierre: c.fechaCierre?.toISOString() ?? null,
    abiertaPor: c.abiertaPor.name,
    cerradaPor: c.cerradaPor?.name ?? null,
    montoInicial: decimalATexto(c.montoInicial) ?? "0.00",
    esperado: decimalATexto(c.efectivoEsperado),
    contado: decimalATexto(c.efectivoContado),
    diferencia: decimalATexto(c.diferencia),
  }));
  return { items, total, page, pageSize: PAGE_SIZE };
}
