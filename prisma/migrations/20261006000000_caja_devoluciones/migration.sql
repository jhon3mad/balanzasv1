-- CreateEnum
CREATE TYPE "EstadoCaja" AS ENUM ('ABIERTA', 'CERRADA');

-- CreateEnum
CREATE TYPE "TipoMovimientoCaja" AS ENUM ('INGRESO', 'EGRESO');

-- AlterEnum
ALTER TYPE "TipoMovimiento" ADD VALUE 'DEVOLUCION_VENTA';

-- AlterTable
ALTER TABLE "movimiento_inventario" ADD COLUMN     "devolucionId" INTEGER;

-- AlterTable
ALTER TABLE "venta_detalle" ADD COLUMN     "cantidadDevuelta" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "montoDevuelto" DECIMAL(12,2) NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "devolucion" (
    "id" SERIAL NOT NULL,
    "ventaId" INTEGER NOT NULL,
    "motivo" TEXT NOT NULL,
    "total" DECIMAL(12,2) NOT NULL,
    "montoReembolso" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "metodoPagoId" INTEGER,
    "usuarioId" TEXT NOT NULL,
    "fecha" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "devolucion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "devolucion_detalle" (
    "id" SERIAL NOT NULL,
    "devolucionId" INTEGER NOT NULL,
    "ventaDetalleId" INTEGER NOT NULL,
    "cantidad" INTEGER NOT NULL,
    "subtotal" DECIMAL(12,2) NOT NULL,
    "reingresaStock" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "devolucion_detalle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "caja" (
    "id" SERIAL NOT NULL,
    "estado" "EstadoCaja" NOT NULL DEFAULT 'ABIERTA',
    "montoInicial" DECIMAL(12,2) NOT NULL,
    "fechaApertura" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "abiertaPorId" TEXT NOT NULL,
    "fechaCierre" TIMESTAMPTZ(3),
    "cerradaPorId" TEXT,
    "efectivoEsperado" DECIMAL(12,2),
    "efectivoContado" DECIMAL(12,2),
    "diferencia" DECIMAL(12,2),
    "resumen" JSONB,
    "observaciones" TEXT,

    CONSTRAINT "caja_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "movimiento_caja" (
    "id" SERIAL NOT NULL,
    "cajaId" INTEGER NOT NULL,
    "tipo" "TipoMovimientoCaja" NOT NULL,
    "monto" DECIMAL(12,2) NOT NULL,
    "concepto" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "fecha" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "movimiento_caja_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "devolucion_ventaId_idx" ON "devolucion"("ventaId");

-- CreateIndex
CREATE INDEX "devolucion_fecha_idx" ON "devolucion"("fecha");

-- CreateIndex
CREATE INDEX "devolucion_detalle_devolucionId_idx" ON "devolucion_detalle"("devolucionId");

-- CreateIndex
CREATE INDEX "devolucion_detalle_ventaDetalleId_idx" ON "devolucion_detalle"("ventaDetalleId");

-- CreateIndex
CREATE INDEX "caja_fechaApertura_idx" ON "caja"("fechaApertura");

-- CreateIndex
CREATE INDEX "movimiento_caja_cajaId_idx" ON "movimiento_caja"("cajaId");

-- AddForeignKey
ALTER TABLE "movimiento_inventario" ADD CONSTRAINT "movimiento_inventario_devolucionId_fkey" FOREIGN KEY ("devolucionId") REFERENCES "devolucion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "devolucion" ADD CONSTRAINT "devolucion_ventaId_fkey" FOREIGN KEY ("ventaId") REFERENCES "venta"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "devolucion" ADD CONSTRAINT "devolucion_metodoPagoId_fkey" FOREIGN KEY ("metodoPagoId") REFERENCES "metodo_pago"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "devolucion" ADD CONSTRAINT "devolucion_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "devolucion_detalle" ADD CONSTRAINT "devolucion_detalle_devolucionId_fkey" FOREIGN KEY ("devolucionId") REFERENCES "devolucion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "devolucion_detalle" ADD CONSTRAINT "devolucion_detalle_ventaDetalleId_fkey" FOREIGN KEY ("ventaDetalleId") REFERENCES "venta_detalle"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "caja" ADD CONSTRAINT "caja_abiertaPorId_fkey" FOREIGN KEY ("abiertaPorId") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "caja" ADD CONSTRAINT "caja_cerradaPorId_fkey" FOREIGN KEY ("cerradaPorId") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "movimiento_caja" ADD CONSTRAINT "movimiento_caja_cajaId_fkey" FOREIGN KEY ("cajaId") REFERENCES "caja"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "movimiento_caja" ADD CONSTRAINT "movimiento_caja_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ─────────────────────────────────────────────────────────────
-- Restricciones agregadas a mano
-- ─────────────────────────────────────────────────────────────

-- Devoluciones
ALTER TABLE "venta_detalle" ADD CONSTRAINT "venta_detalle_devuelto_valido" CHECK (
  "cantidadDevuelta" >= 0 AND "cantidadDevuelta" <= "cantidad" AND "montoDevuelto" >= 0 AND "montoDevuelto" <= "subtotal"
);
ALTER TABLE "devolucion" ADD CONSTRAINT "devolucion_montos_validos" CHECK (
  "total" > 0 AND "montoReembolso" >= 0 AND "montoReembolso" <= "total"
  AND ("montoReembolso" = 0 OR "metodoPagoId" IS NOT NULL)
);
ALTER TABLE "devolucion_detalle" ADD CONSTRAINT "devolucion_detalle_valores_validos" CHECK ("cantidad" > 0 AND "subtotal" >= 0);

-- Caja
ALTER TABLE "caja" ADD CONSTRAINT "caja_montos_validos" CHECK (
  "montoInicial" >= 0 AND ("efectivoContado" IS NULL OR "efectivoContado" >= 0)
);
ALTER TABLE "caja" ADD CONSTRAINT "caja_cierre_completo" CHECK (
  "estado" = 'ABIERTA'
  OR ("fechaCierre" IS NOT NULL AND "cerradaPorId" IS NOT NULL AND "efectivoEsperado" IS NOT NULL AND "efectivoContado" IS NOT NULL AND "diferencia" IS NOT NULL)
);
ALTER TABLE "movimiento_caja" ADD CONSTRAINT "movimiento_caja_monto_positivo" CHECK ("monto" > 0);

-- Solo una caja abierta a la vez (un solo local)
CREATE UNIQUE INDEX "caja_una_abierta" ON "caja" ((true)) WHERE "estado" = 'ABIERTA';

