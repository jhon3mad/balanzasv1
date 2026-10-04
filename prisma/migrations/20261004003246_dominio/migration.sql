-- CreateEnum
CREATE TYPE "TipoSerie" AS ENUM ('BOLETA', 'ORDEN_SERVICIO', 'COMPRA');

-- CreateEnum
CREATE TYPE "TipoProducto" AS ENUM ('BALANZA', 'BATERIA', 'ENCHUFE', 'SENSOR', 'TARJETA', 'REPUESTO', 'OTRO');

-- CreateEnum
CREATE TYPE "Funcionamiento" AS ENUM ('DIGITAL', 'MECANICA_RELOJ', 'MECANICA_ROMANA');

-- CreateEnum
CREATE TYPE "TipoEnchufe" AS ENUM ('PUNTA', 'TRIANGULAR');

-- CreateEnum
CREATE TYPE "TipoDocIdentidad" AS ENUM ('DNI', 'RUC', 'CE', 'PASAPORTE', 'OTRO');

-- CreateEnum
CREATE TYPE "EstadoCompra" AS ENUM ('PENDIENTE', 'RECIBIDA', 'ANULADA');

-- CreateEnum
CREATE TYPE "EstadoPago" AS ENUM ('PENDIENTE', 'PARCIAL', 'PAGADO');

-- CreateEnum
CREATE TYPE "TipoEmpaque" AS ENUM ('UNIDAD', 'CAJA', 'DECENA', 'DOCENA', 'CIENTO');

-- CreateEnum
CREATE TYPE "TipoVenta" AS ENUM ('VENTA', 'SERVICIO');

-- CreateEnum
CREATE TYPE "EstadoVenta" AS ENUM ('ABIERTA', 'EMITIDA', 'ANULADA');

-- CreateEnum
CREATE TYPE "EstadoEntrega" AS ENUM ('PENDIENTE', 'ENTREGADO');

-- CreateEnum
CREATE TYPE "TipoItem" AS ENUM ('PRODUCTO', 'SERVICIO');

-- CreateEnum
CREATE TYPE "EstadoOrden" AS ENUM ('RECIBIDO', 'EN_DIAGNOSTICO', 'EN_REPARACION', 'LISTO', 'ENTREGADO', 'CANCELADO');

-- CreateEnum
CREATE TYPE "MotivoAjuste" AS ENUM ('INVENTARIO_INICIAL', 'CONTEO', 'MERMA', 'ROTURA', 'DEVOLUCION_PROVEEDOR', 'USO_INTERNO', 'OTRO');

-- CreateEnum
CREATE TYPE "TipoMovimiento" AS ENUM ('INVENTARIO_INICIAL', 'COMPRA', 'ANULACION_COMPRA', 'VENTA', 'ANULACION_VENTA', 'AJUSTE_ENTRADA', 'AJUSTE_SALIDA');

-- CreateTable
CREATE TABLE "serie" (
    "id" SERIAL NOT NULL,
    "tipo" "TipoSerie" NOT NULL,
    "serie" VARCHAR(4) NOT NULL,
    "ultimoNumero" INTEGER NOT NULL DEFAULT 0,
    "activa" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "serie_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "auditoria" (
    "id" SERIAL NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "accion" TEXT NOT NULL,
    "entidad" TEXT NOT NULL,
    "entidadId" TEXT NOT NULL,
    "datos" JSONB,
    "fecha" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "auditoria_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "marca" (
    "id" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "marca_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "uso_balanza" (
    "id" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "uso_balanza_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "forma_balanza" (
    "id" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "forma_balanza_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "metodo_pago" (
    "id" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,
    "esEfectivo" BOOLEAN NOT NULL DEFAULT false,
    "requiereReferencia" BOOLEAN NOT NULL DEFAULT false,
    "orden" INTEGER NOT NULL DEFAULT 0,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "metodo_pago_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "servicio" (
    "id" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT,
    "precioReferencial" DECIMAL(12,2) NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "servicio_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "producto" (
    "id" SERIAL NOT NULL,
    "tipo" "TipoProducto" NOT NULL,
    "nombre" TEXT NOT NULL,
    "modelo" TEXT,
    "marcaId" INTEGER,
    "descripcion" TEXT,
    "observaciones" TEXT,
    "usoId" INTEGER,
    "formaId" INTEGER,
    "funcionamiento" "Funcionamiento",
    "capacidadKg" DECIMAL(10,3),
    "precisionG" DECIMAL(10,3),
    "voltaje" DECIMAL(5,2),
    "tipoEnchufe" "TipoEnchufe",
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "producto_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "presentacion" (
    "id" SERIAL NOT NULL,
    "productoId" INTEGER NOT NULL,
    "nombre" TEXT NOT NULL DEFAULT 'Estándar',
    "codigo" TEXT NOT NULL,
    "codigoBarras" TEXT,
    "precioVenta" DECIMAL(12,2) NOT NULL,
    "precioMinimo" DECIMAL(12,2) NOT NULL,
    "costoPromedio" DECIMAL(12,4) NOT NULL DEFAULT 0,
    "ultimoCosto" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "stock" INTEGER NOT NULL DEFAULT 0,
    "stockMinimo" INTEGER NOT NULL DEFAULT 0,
    "unidadesPorCaja" INTEGER,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "presentacion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cliente" (
    "id" SERIAL NOT NULL,
    "tipoDocumento" "TipoDocIdentidad",
    "numeroDocumento" TEXT,
    "nombre" TEXT NOT NULL,
    "telefono" TEXT,
    "direccion" TEXT,
    "email" TEXT,
    "notas" TEXT,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "cliente_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "proveedor" (
    "id" SERIAL NOT NULL,
    "ruc" TEXT,
    "razonSocial" TEXT NOT NULL,
    "contacto" TEXT,
    "telefono" TEXT,
    "email" TEXT,
    "direccion" TEXT,
    "notas" TEXT,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "proveedor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "compra" (
    "id" SERIAL NOT NULL,
    "serie" VARCHAR(4) NOT NULL,
    "numero" INTEGER NOT NULL,
    "proveedorId" INTEGER NOT NULL,
    "estado" "EstadoCompra" NOT NULL DEFAULT 'PENDIENTE',
    "fechaPedido" TIMESTAMPTZ(3) NOT NULL,
    "fechaRecepcion" TIMESTAMPTZ(3),
    "documentoProveedor" TEXT,
    "total" DECIMAL(12,2) NOT NULL,
    "montoPagado" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "estadoPago" "EstadoPago" NOT NULL DEFAULT 'PENDIENTE',
    "observaciones" TEXT,
    "creadoPorId" TEXT NOT NULL,
    "recibidoPorId" TEXT,
    "anuladoPorId" TEXT,
    "fechaAnulacion" TIMESTAMPTZ(3),
    "motivoAnulacion" TEXT,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "compra_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "compra_detalle" (
    "id" SERIAL NOT NULL,
    "compraId" INTEGER NOT NULL,
    "presentacionId" INTEGER NOT NULL,
    "empaque" "TipoEmpaque" NOT NULL,
    "unidadesPorEmpaque" INTEGER NOT NULL,
    "cantidadEmpaques" INTEGER NOT NULL,
    "cantidadUnidades" INTEGER NOT NULL,
    "cantidadRecibida" INTEGER,
    "costoEmpaque" DECIMAL(12,2) NOT NULL,
    "costoUnitario" DECIMAL(12,4) NOT NULL,
    "subtotal" DECIMAL(12,2) NOT NULL,

    CONSTRAINT "compra_detalle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pago_compra" (
    "id" SERIAL NOT NULL,
    "compraId" INTEGER NOT NULL,
    "metodoPagoId" INTEGER NOT NULL,
    "monto" DECIMAL(12,2) NOT NULL,
    "referencia" TEXT,
    "fecha" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "usuarioId" TEXT NOT NULL,
    "anulado" BOOLEAN NOT NULL DEFAULT false,
    "motivoAnulacion" TEXT,

    CONSTRAINT "pago_compra_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "venta" (
    "id" SERIAL NOT NULL,
    "tipo" "TipoVenta" NOT NULL DEFAULT 'VENTA',
    "estado" "EstadoVenta" NOT NULL,
    "serie" VARCHAR(4),
    "numero" INTEGER,
    "fechaEmision" TIMESTAMPTZ(3),
    "clienteId" INTEGER,
    "vendedorId" TEXT NOT NULL,
    "totalLista" DECIMAL(12,2) NOT NULL,
    "descuento" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "total" DECIMAL(12,2) NOT NULL,
    "montoPagado" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "saldo" DECIMAL(12,2) NOT NULL,
    "estadoPago" "EstadoPago" NOT NULL DEFAULT 'PENDIENTE',
    "estadoEntrega" "EstadoEntrega" NOT NULL DEFAULT 'PENDIENTE',
    "fechaEntrega" TIMESTAMPTZ(3),
    "entregadoPorId" TEXT,
    "observaciones" TEXT,
    "anuladoPorId" TEXT,
    "fechaAnulacion" TIMESTAMPTZ(3),
    "motivoAnulacion" TEXT,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "venta_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "venta_detalle" (
    "id" SERIAL NOT NULL,
    "ventaId" INTEGER NOT NULL,
    "tipoItem" "TipoItem" NOT NULL,
    "presentacionId" INTEGER,
    "servicioId" INTEGER,
    "descripcion" TEXT NOT NULL,
    "cantidad" INTEGER NOT NULL,
    "precioLista" DECIMAL(12,2) NOT NULL,
    "precioUnitario" DECIMAL(12,2) NOT NULL,
    "costoUnitario" DECIMAL(12,4) NOT NULL DEFAULT 0,
    "subtotal" DECIMAL(12,2) NOT NULL,

    CONSTRAINT "venta_detalle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pago" (
    "id" SERIAL NOT NULL,
    "ventaId" INTEGER NOT NULL,
    "metodoPagoId" INTEGER NOT NULL,
    "monto" DECIMAL(12,2) NOT NULL,
    "montoRecibido" DECIMAL(12,2),
    "referencia" TEXT,
    "fecha" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "usuarioId" TEXT NOT NULL,
    "anulado" BOOLEAN NOT NULL DEFAULT false,
    "anuladoPorId" TEXT,
    "fechaAnulacion" TIMESTAMPTZ(3),
    "motivoAnulacion" TEXT,

    CONSTRAINT "pago_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "orden_servicio" (
    "id" SERIAL NOT NULL,
    "serie" VARCHAR(4) NOT NULL,
    "numero" INTEGER NOT NULL,
    "ventaId" INTEGER NOT NULL,
    "estado" "EstadoOrden" NOT NULL DEFAULT 'RECIBIDO',
    "equipo" TEXT NOT NULL,
    "marca" TEXT,
    "modelo" TEXT,
    "numeroSerie" TEXT,
    "accesorios" TEXT,
    "fallaReportada" TEXT NOT NULL,
    "diagnostico" TEXT,
    "presupuesto" DECIMAL(12,2),
    "tecnicoId" TEXT,
    "fechaRecepcion" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fechaPrometida" TIMESTAMPTZ(3),
    "fechaListo" TIMESTAMPTZ(3),
    "fechaEntrega" TIMESTAMPTZ(3),
    "garantiaDias" INTEGER,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "orden_servicio_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "orden_servicio_historial" (
    "id" SERIAL NOT NULL,
    "ordenId" INTEGER NOT NULL,
    "estadoAnterior" "EstadoOrden",
    "estadoNuevo" "EstadoOrden" NOT NULL,
    "nota" TEXT,
    "usuarioId" TEXT NOT NULL,
    "fecha" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "orden_servicio_historial_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ajuste_inventario" (
    "id" SERIAL NOT NULL,
    "motivo" "MotivoAjuste" NOT NULL,
    "observacion" TEXT,
    "usuarioId" TEXT NOT NULL,
    "fecha" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ajuste_inventario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "movimiento_inventario" (
    "id" SERIAL NOT NULL,
    "presentacionId" INTEGER NOT NULL,
    "tipo" "TipoMovimiento" NOT NULL,
    "cantidad" INTEGER NOT NULL,
    "stockAnterior" INTEGER NOT NULL,
    "stockNuevo" INTEGER NOT NULL,
    "costoUnitario" DECIMAL(12,4) NOT NULL,
    "ventaId" INTEGER,
    "compraId" INTEGER,
    "ajusteId" INTEGER,
    "usuarioId" TEXT NOT NULL,
    "nota" TEXT,
    "fecha" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "movimiento_inventario_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "serie_tipo_serie_key" ON "serie"("tipo", "serie");

-- CreateIndex
CREATE INDEX "auditoria_entidad_entidadId_idx" ON "auditoria"("entidad", "entidadId");

-- CreateIndex
CREATE INDEX "auditoria_fecha_idx" ON "auditoria"("fecha");

-- CreateIndex
CREATE UNIQUE INDEX "marca_nombre_key" ON "marca"("nombre");

-- CreateIndex
CREATE UNIQUE INDEX "uso_balanza_nombre_key" ON "uso_balanza"("nombre");

-- CreateIndex
CREATE UNIQUE INDEX "forma_balanza_nombre_key" ON "forma_balanza"("nombre");

-- CreateIndex
CREATE UNIQUE INDEX "metodo_pago_nombre_key" ON "metodo_pago"("nombre");

-- CreateIndex
CREATE UNIQUE INDEX "servicio_nombre_key" ON "servicio"("nombre");

-- CreateIndex
CREATE INDEX "producto_tipo_idx" ON "producto"("tipo");

-- CreateIndex
CREATE INDEX "producto_marcaId_idx" ON "producto"("marcaId");

-- CreateIndex
CREATE INDEX "producto_nombre_idx" ON "producto"("nombre");

-- CreateIndex
CREATE UNIQUE INDEX "presentacion_codigo_key" ON "presentacion"("codigo");

-- CreateIndex
CREATE UNIQUE INDEX "presentacion_codigoBarras_key" ON "presentacion"("codigoBarras");

-- CreateIndex
CREATE UNIQUE INDEX "presentacion_productoId_nombre_key" ON "presentacion"("productoId", "nombre");

-- CreateIndex
CREATE INDEX "cliente_nombre_idx" ON "cliente"("nombre");

-- CreateIndex
CREATE UNIQUE INDEX "cliente_tipoDocumento_numeroDocumento_key" ON "cliente"("tipoDocumento", "numeroDocumento");

-- CreateIndex
CREATE UNIQUE INDEX "proveedor_ruc_key" ON "proveedor"("ruc");

-- CreateIndex
CREATE INDEX "proveedor_razonSocial_idx" ON "proveedor"("razonSocial");

-- CreateIndex
CREATE INDEX "compra_proveedorId_idx" ON "compra"("proveedorId");

-- CreateIndex
CREATE INDEX "compra_estado_idx" ON "compra"("estado");

-- CreateIndex
CREATE INDEX "compra_fechaPedido_idx" ON "compra"("fechaPedido");

-- CreateIndex
CREATE UNIQUE INDEX "compra_serie_numero_key" ON "compra"("serie", "numero");

-- CreateIndex
CREATE INDEX "compra_detalle_compraId_idx" ON "compra_detalle"("compraId");

-- CreateIndex
CREATE INDEX "compra_detalle_presentacionId_idx" ON "compra_detalle"("presentacionId");

-- CreateIndex
CREATE INDEX "pago_compra_compraId_idx" ON "pago_compra"("compraId");

-- CreateIndex
CREATE INDEX "venta_fechaEmision_idx" ON "venta"("fechaEmision");

-- CreateIndex
CREATE INDEX "venta_estado_idx" ON "venta"("estado");

-- CreateIndex
CREATE INDEX "venta_estadoPago_idx" ON "venta"("estadoPago");

-- CreateIndex
CREATE INDEX "venta_estadoEntrega_idx" ON "venta"("estadoEntrega");

-- CreateIndex
CREATE INDEX "venta_clienteId_idx" ON "venta"("clienteId");

-- CreateIndex
CREATE INDEX "venta_vendedorId_idx" ON "venta"("vendedorId");

-- CreateIndex
CREATE UNIQUE INDEX "venta_serie_numero_key" ON "venta"("serie", "numero");

-- CreateIndex
CREATE INDEX "venta_detalle_ventaId_idx" ON "venta_detalle"("ventaId");

-- CreateIndex
CREATE INDEX "venta_detalle_presentacionId_idx" ON "venta_detalle"("presentacionId");

-- CreateIndex
CREATE INDEX "pago_ventaId_idx" ON "pago"("ventaId");

-- CreateIndex
CREATE INDEX "pago_fecha_idx" ON "pago"("fecha");

-- CreateIndex
CREATE UNIQUE INDEX "orden_servicio_ventaId_key" ON "orden_servicio"("ventaId");

-- CreateIndex
CREATE INDEX "orden_servicio_estado_idx" ON "orden_servicio"("estado");

-- CreateIndex
CREATE UNIQUE INDEX "orden_servicio_serie_numero_key" ON "orden_servicio"("serie", "numero");

-- CreateIndex
CREATE INDEX "orden_servicio_historial_ordenId_idx" ON "orden_servicio_historial"("ordenId");

-- CreateIndex
CREATE INDEX "ajuste_inventario_fecha_idx" ON "ajuste_inventario"("fecha");

-- CreateIndex
CREATE INDEX "movimiento_inventario_presentacionId_fecha_idx" ON "movimiento_inventario"("presentacionId", "fecha");

-- CreateIndex
CREATE INDEX "movimiento_inventario_tipo_idx" ON "movimiento_inventario"("tipo");

-- AddForeignKey
ALTER TABLE "auditoria" ADD CONSTRAINT "auditoria_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "producto" ADD CONSTRAINT "producto_marcaId_fkey" FOREIGN KEY ("marcaId") REFERENCES "marca"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "producto" ADD CONSTRAINT "producto_usoId_fkey" FOREIGN KEY ("usoId") REFERENCES "uso_balanza"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "producto" ADD CONSTRAINT "producto_formaId_fkey" FOREIGN KEY ("formaId") REFERENCES "forma_balanza"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "presentacion" ADD CONSTRAINT "presentacion_productoId_fkey" FOREIGN KEY ("productoId") REFERENCES "producto"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "compra" ADD CONSTRAINT "compra_proveedorId_fkey" FOREIGN KEY ("proveedorId") REFERENCES "proveedor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "compra" ADD CONSTRAINT "compra_creadoPorId_fkey" FOREIGN KEY ("creadoPorId") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "compra" ADD CONSTRAINT "compra_recibidoPorId_fkey" FOREIGN KEY ("recibidoPorId") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "compra" ADD CONSTRAINT "compra_anuladoPorId_fkey" FOREIGN KEY ("anuladoPorId") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "compra_detalle" ADD CONSTRAINT "compra_detalle_compraId_fkey" FOREIGN KEY ("compraId") REFERENCES "compra"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "compra_detalle" ADD CONSTRAINT "compra_detalle_presentacionId_fkey" FOREIGN KEY ("presentacionId") REFERENCES "presentacion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pago_compra" ADD CONSTRAINT "pago_compra_compraId_fkey" FOREIGN KEY ("compraId") REFERENCES "compra"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pago_compra" ADD CONSTRAINT "pago_compra_metodoPagoId_fkey" FOREIGN KEY ("metodoPagoId") REFERENCES "metodo_pago"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pago_compra" ADD CONSTRAINT "pago_compra_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "venta" ADD CONSTRAINT "venta_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "cliente"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "venta" ADD CONSTRAINT "venta_vendedorId_fkey" FOREIGN KEY ("vendedorId") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "venta" ADD CONSTRAINT "venta_entregadoPorId_fkey" FOREIGN KEY ("entregadoPorId") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "venta" ADD CONSTRAINT "venta_anuladoPorId_fkey" FOREIGN KEY ("anuladoPorId") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "venta_detalle" ADD CONSTRAINT "venta_detalle_ventaId_fkey" FOREIGN KEY ("ventaId") REFERENCES "venta"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "venta_detalle" ADD CONSTRAINT "venta_detalle_presentacionId_fkey" FOREIGN KEY ("presentacionId") REFERENCES "presentacion"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "venta_detalle" ADD CONSTRAINT "venta_detalle_servicioId_fkey" FOREIGN KEY ("servicioId") REFERENCES "servicio"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pago" ADD CONSTRAINT "pago_ventaId_fkey" FOREIGN KEY ("ventaId") REFERENCES "venta"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pago" ADD CONSTRAINT "pago_metodoPagoId_fkey" FOREIGN KEY ("metodoPagoId") REFERENCES "metodo_pago"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pago" ADD CONSTRAINT "pago_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pago" ADD CONSTRAINT "pago_anuladoPorId_fkey" FOREIGN KEY ("anuladoPorId") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orden_servicio" ADD CONSTRAINT "orden_servicio_ventaId_fkey" FOREIGN KEY ("ventaId") REFERENCES "venta"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orden_servicio" ADD CONSTRAINT "orden_servicio_tecnicoId_fkey" FOREIGN KEY ("tecnicoId") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orden_servicio_historial" ADD CONSTRAINT "orden_servicio_historial_ordenId_fkey" FOREIGN KEY ("ordenId") REFERENCES "orden_servicio"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orden_servicio_historial" ADD CONSTRAINT "orden_servicio_historial_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ajuste_inventario" ADD CONSTRAINT "ajuste_inventario_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "movimiento_inventario" ADD CONSTRAINT "movimiento_inventario_presentacionId_fkey" FOREIGN KEY ("presentacionId") REFERENCES "presentacion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "movimiento_inventario" ADD CONSTRAINT "movimiento_inventario_ventaId_fkey" FOREIGN KEY ("ventaId") REFERENCES "venta"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "movimiento_inventario" ADD CONSTRAINT "movimiento_inventario_compraId_fkey" FOREIGN KEY ("compraId") REFERENCES "compra"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "movimiento_inventario" ADD CONSTRAINT "movimiento_inventario_ajusteId_fkey" FOREIGN KEY ("ajusteId") REFERENCES "ajuste_inventario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "movimiento_inventario" ADD CONSTRAINT "movimiento_inventario_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ─────────────────────────────────────────────────────────────
-- Restricciones CHECK (integridad de negocio, agregadas a mano)
-- ─────────────────────────────────────────────────────────────

-- Presentación: stock y precios coherentes
ALTER TABLE "presentacion" ADD CONSTRAINT "presentacion_stock_no_negativo" CHECK ("stock" >= 0);
ALTER TABLE "presentacion" ADD CONSTRAINT "presentacion_stock_minimo_no_negativo" CHECK ("stockMinimo" >= 0);
ALTER TABLE "presentacion" ADD CONSTRAINT "presentacion_precios_validos" CHECK ("precioMinimo" >= 0 AND "precioMinimo" <= "precioVenta");
ALTER TABLE "presentacion" ADD CONSTRAINT "presentacion_costos_no_negativos" CHECK ("costoPromedio" >= 0 AND "ultimoCosto" >= 0);
ALTER TABLE "presentacion" ADD CONSTRAINT "presentacion_unidades_caja_positivo" CHECK ("unidadesPorCaja" IS NULL OR "unidadesPorCaja" > 0);

-- Servicio
ALTER TABLE "servicio" ADD CONSTRAINT "servicio_precio_no_negativo" CHECK ("precioReferencial" >= 0);

-- Serie
ALTER TABLE "serie" ADD CONSTRAINT "serie_ultimo_numero_no_negativo" CHECK ("ultimoNumero" >= 0);

-- Compras
ALTER TABLE "compra" ADD CONSTRAINT "compra_montos_validos" CHECK ("total" >= 0 AND "montoPagado" >= 0 AND "montoPagado" <= "total");
ALTER TABLE "compra_detalle" ADD CONSTRAINT "compra_detalle_cantidades_validas" CHECK (
  "unidadesPorEmpaque" > 0 AND "cantidadEmpaques" > 0
  AND "cantidadUnidades" = "unidadesPorEmpaque" * "cantidadEmpaques"
  AND ("cantidadRecibida" IS NULL OR "cantidadRecibida" >= 0)
);
ALTER TABLE "compra_detalle" ADD CONSTRAINT "compra_detalle_costos_no_negativos" CHECK ("costoEmpaque" >= 0 AND "costoUnitario" >= 0 AND "subtotal" >= 0);
ALTER TABLE "pago_compra" ADD CONSTRAINT "pago_compra_monto_positivo" CHECK ("monto" > 0);

-- Ventas
ALTER TABLE "venta" ADD CONSTRAINT "venta_montos_validos" CHECK (
  "total" >= 0 AND "totalLista" >= 0 AND "montoPagado" >= 0 AND "saldo" >= 0
  AND "saldo" = "total" - "montoPagado"
);
ALTER TABLE "venta" ADD CONSTRAINT "venta_emitida_con_numero" CHECK (
  "estado" = 'ABIERTA' OR ("serie" IS NOT NULL AND "numero" IS NOT NULL AND "fechaEmision" IS NOT NULL)
  OR ("estado" = 'ANULADA')
);
ALTER TABLE "venta_detalle" ADD CONSTRAINT "venta_detalle_cantidad_positiva" CHECK ("cantidad" > 0);
ALTER TABLE "venta_detalle" ADD CONSTRAINT "venta_detalle_montos_no_negativos" CHECK ("precioLista" >= 0 AND "precioUnitario" >= 0 AND "costoUnitario" >= 0 AND "subtotal" >= 0);
ALTER TABLE "venta_detalle" ADD CONSTRAINT "venta_detalle_item_valido" CHECK (
  ("tipoItem" = 'PRODUCTO' AND "presentacionId" IS NOT NULL AND "servicioId" IS NULL)
  OR ("tipoItem" = 'SERVICIO' AND "servicioId" IS NOT NULL AND "presentacionId" IS NULL)
);
ALTER TABLE "pago" ADD CONSTRAINT "pago_monto_positivo" CHECK ("monto" > 0);
ALTER TABLE "pago" ADD CONSTRAINT "pago_monto_recibido_valido" CHECK ("montoRecibido" IS NULL OR "montoRecibido" >= "monto");

-- Órdenes de servicio
ALTER TABLE "orden_servicio" ADD CONSTRAINT "orden_servicio_valores_no_negativos" CHECK (
  ("presupuesto" IS NULL OR "presupuesto" >= 0) AND ("garantiaDias" IS NULL OR "garantiaDias" >= 0)
);

-- Inventario
ALTER TABLE "movimiento_inventario" ADD CONSTRAINT "movimiento_cantidad_distinta_cero" CHECK ("cantidad" <> 0);
ALTER TABLE "movimiento_inventario" ADD CONSTRAINT "movimiento_stock_coherente" CHECK (
  "stockNuevo" = "stockAnterior" + "cantidad" AND "stockNuevo" >= 0
);
