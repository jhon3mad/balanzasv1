import type { Prisma, TipoSerie } from "../../generated/prisma/client";
import { AppError } from "@/lib/errors";

/**
 * Toma el siguiente número de la serie activa del tipo indicado.
 * Debe llamarse DENTRO de la transacción que crea el documento: el UPDATE bloquea
 * la fila, así dos ventas simultáneas nunca obtienen el mismo número, y si la
 * transacción falla el número no se consume.
 */
export async function siguienteNumero(
  tx: Prisma.TransactionClient,
  tipo: TipoSerie,
): Promise<{ serie: string; numero: number }> {
  const filas = await tx.$queryRaw<{ serie: string; ultimoNumero: number }[]>`
    UPDATE "serie"
    SET "ultimoNumero" = "ultimoNumero" + 1, "updatedAt" = NOW()
    WHERE "id" = (
      SELECT "id" FROM "serie"
      WHERE "tipo" = ${tipo}::"TipoSerie" AND "activa" = true
      ORDER BY "id"
      LIMIT 1
    )
    RETURNING "serie", "ultimoNumero"
  `;
  const fila = filas[0];
  if (!fila) throw new AppError("No hay una serie activa configurada para este documento.");
  return { serie: fila.serie, numero: fila.ultimoNumero };
}

export function formatearNumero(serie: string, numero: number): string {
  return `${serie}-${String(numero).padStart(8, "0")}`;
}
