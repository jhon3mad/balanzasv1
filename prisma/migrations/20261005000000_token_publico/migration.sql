-- Enlace público (WhatsApp) de boletas y órdenes de servicio
ALTER TABLE "venta" ADD COLUMN "tokenPublico" TEXT;
ALTER TABLE "orden_servicio" ADD COLUMN "tokenPublico" TEXT;

CREATE UNIQUE INDEX "venta_tokenPublico_key" ON "venta"("tokenPublico");
CREATE UNIQUE INDEX "orden_servicio_tokenPublico_key" ON "orden_servicio"("tokenPublico");
