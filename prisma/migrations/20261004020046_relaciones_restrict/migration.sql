-- DropForeignKey
ALTER TABLE "compra" DROP CONSTRAINT "compra_anuladoPorId_fkey";

-- DropForeignKey
ALTER TABLE "compra" DROP CONSTRAINT "compra_recibidoPorId_fkey";

-- DropForeignKey
ALTER TABLE "movimiento_inventario" DROP CONSTRAINT "movimiento_inventario_ajusteId_fkey";

-- DropForeignKey
ALTER TABLE "movimiento_inventario" DROP CONSTRAINT "movimiento_inventario_compraId_fkey";

-- DropForeignKey
ALTER TABLE "movimiento_inventario" DROP CONSTRAINT "movimiento_inventario_ventaId_fkey";

-- DropForeignKey
ALTER TABLE "orden_servicio" DROP CONSTRAINT "orden_servicio_tecnicoId_fkey";

-- DropForeignKey
ALTER TABLE "pago" DROP CONSTRAINT "pago_anuladoPorId_fkey";

-- DropForeignKey
ALTER TABLE "producto" DROP CONSTRAINT "producto_formaId_fkey";

-- DropForeignKey
ALTER TABLE "producto" DROP CONSTRAINT "producto_marcaId_fkey";

-- DropForeignKey
ALTER TABLE "producto" DROP CONSTRAINT "producto_usoId_fkey";

-- DropForeignKey
ALTER TABLE "venta" DROP CONSTRAINT "venta_anuladoPorId_fkey";

-- DropForeignKey
ALTER TABLE "venta" DROP CONSTRAINT "venta_clienteId_fkey";

-- DropForeignKey
ALTER TABLE "venta" DROP CONSTRAINT "venta_entregadoPorId_fkey";

-- DropForeignKey
ALTER TABLE "venta_detalle" DROP CONSTRAINT "venta_detalle_presentacionId_fkey";

-- DropForeignKey
ALTER TABLE "venta_detalle" DROP CONSTRAINT "venta_detalle_servicioId_fkey";

-- AddForeignKey
ALTER TABLE "producto" ADD CONSTRAINT "producto_marcaId_fkey" FOREIGN KEY ("marcaId") REFERENCES "marca"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "producto" ADD CONSTRAINT "producto_usoId_fkey" FOREIGN KEY ("usoId") REFERENCES "uso_balanza"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "producto" ADD CONSTRAINT "producto_formaId_fkey" FOREIGN KEY ("formaId") REFERENCES "forma_balanza"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "compra" ADD CONSTRAINT "compra_recibidoPorId_fkey" FOREIGN KEY ("recibidoPorId") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "compra" ADD CONSTRAINT "compra_anuladoPorId_fkey" FOREIGN KEY ("anuladoPorId") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "venta" ADD CONSTRAINT "venta_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "cliente"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "venta" ADD CONSTRAINT "venta_entregadoPorId_fkey" FOREIGN KEY ("entregadoPorId") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "venta" ADD CONSTRAINT "venta_anuladoPorId_fkey" FOREIGN KEY ("anuladoPorId") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "venta_detalle" ADD CONSTRAINT "venta_detalle_presentacionId_fkey" FOREIGN KEY ("presentacionId") REFERENCES "presentacion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "venta_detalle" ADD CONSTRAINT "venta_detalle_servicioId_fkey" FOREIGN KEY ("servicioId") REFERENCES "servicio"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pago" ADD CONSTRAINT "pago_anuladoPorId_fkey" FOREIGN KEY ("anuladoPorId") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orden_servicio" ADD CONSTRAINT "orden_servicio_tecnicoId_fkey" FOREIGN KEY ("tecnicoId") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "movimiento_inventario" ADD CONSTRAINT "movimiento_inventario_ventaId_fkey" FOREIGN KEY ("ventaId") REFERENCES "venta"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "movimiento_inventario" ADD CONSTRAINT "movimiento_inventario_compraId_fkey" FOREIGN KEY ("compraId") REFERENCES "compra"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "movimiento_inventario" ADD CONSTRAINT "movimiento_inventario_ajusteId_fkey" FOREIGN KEY ("ajusteId") REFERENCES "ajuste_inventario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
