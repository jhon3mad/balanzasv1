import type { Prisma } from "../../generated/prisma/client";
import { prisma } from "@/lib/prisma";

type Cliente = Prisma.TransactionClient | typeof prisma;

type RegistroAuditoria = {
  usuarioId: string;
  accion: string;
  entidad: string;
  entidadId: string | number;
  datos?: Prisma.InputJsonValue;
};

/** Registra una acción sensible. Acepta el cliente de una transacción. */
export async function registrarAuditoria(registro: RegistroAuditoria, db: Cliente = prisma) {
  await db.auditoria.create({
    data: {
      usuarioId: registro.usuarioId,
      accion: registro.accion,
      entidad: registro.entidad,
      entidadId: String(registro.entidadId),
      datos: registro.datos,
    },
  });
}
