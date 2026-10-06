# Plan y avance del proyecto

Última actualización: 2026-10-04. Las convenciones técnicas están en [CLAUDE.md](../CLAUDE.md).

## Decisiones del negocio (confirmadas por el dueño)
- Una instalación por tienda; un solo local/almacén.
- Login con usuario + contraseña creado por el admin. El usuario debe cambiar la clave en su primer ingreso.
- Permisos de los 3 roles definidos en código (admin, vendedor, almacenero), no en tablas.
- Compras: pedido → recepción → pagos, con cuentas por pagar.
- Cada presentación tiene precio mínimo: el vendedor no puede bajar de ahí y el admin sí.
- El cliente es obligatorio si queda saldo o la entrega queda pendiente; si no, se usa "Cliente general".
- Servicios técnicos con orden de servicio y estados (recibido → diagnóstico → reparación → listo → entregado).
- Solo boletas internas, sin SUNAT. El título del comprobante es configurable ("BOLETA DE VENTA" / "NOTA DE VENTA").
- Impresora térmica y escáner se comprarán después: el escáner USB funciona como teclado y la impresión será desde el navegador.

## Avance

### ✅ Fase 1 — Fundamentos
- [x] Base de datos completa (todas las tablas, CHECKs y `onDelete: Restrict`) y seed (admin, series B001/OS01/OC01, métodos de pago, usos, formas, marcas, servicios)
- [x] Auth: login por usuario, `proxy.ts`, cerrar sesión, cambio de clave obligatorio
- [x] Layout con sidebar filtrado por rol
- [x] Usuarios: crear, editar, cambiar rol, restablecer clave, activar/desactivar; siempre queda al menos un admin
- [x] Configuración de la tienda (datos, logo, título del comprobante, formato de ticket) y edición de series

### ✅ Fase 2 — Catálogo
- [x] Catálogos: marcas, usos, formas, servicios, métodos de pago
- [x] Productos con presentaciones: formulario según el tipo, stock inicial con kardex, auditoría de cambios de precio

### ✅ Fase 3 — Abastecimiento
- [x] Proveedores
- [x] Compras: pedido (unidad, caja, decena, docena o ciento), recepción parcial o total con costo promedio, "recibir ahora", pagos y anulación
- [x] Inventario: stock con alertas y valorizado, kardex con filtros, ajustes (conteo, merma, rotura, devolución, uso interno, inventario inicial, otro)

### ✅ Fase 4 — Ventas
- [x] 4.1 Clientes (DNI, RUC, CE…; saldo pendiente; `ClienteDialog` reutilizable con `onSaved`)
- [x] 4.2 Punto de venta `/ventas/nueva`: escáner o búsqueda, precio editable con mínimo, pagos mixtos, vuelto, crédito o adelanto, boleta B001
- [x] 4.3 Después de la venta
  - [x] `/ventas`: lista con filtros (búsqueda por boleta/cliente/documento, fechas, vendedor, cliente, pago, entrega, vigentes/anuladas); el admin ve totales del filtro y el vendedor "Mis ventas de hoy"
  - [x] `/ventas/[id]`: detalle con líneas, pagos (recibido y vuelto), saldo, entrega y vendedor; costo y utilidad solo con `reporte:utilidad`
  - [x] Cobrar saldo (`registrarCobro`): pago parcial o total con método, vuelto en efectivo
  - [x] Marcar como entregado (con aviso si aún hay saldo)
  - [x] Asignar o cambiar el cliente (auditado). No se puede pasar a "Cliente general" si hay saldo o entrega pendiente
  - [x] Anular venta (admin, con motivo): devuelve el stock al costo con que salió (kardex `ANULACION_VENTA`), anula los pagos y audita. Los montos se conservan como historial
  - [x] Anular un pago (admin): si la venta es de "Cliente general" y quedaría con saldo, primero hay que asignar un cliente
  - [x] `/cuentas-por-cobrar`: clientes con saldo, venta más antigua, tramos 0–30/31–60/61–90/+90 días; enlaza a `/ventas?cliente=…&pago=DEUDA`
  - [x] Menú habilitado; el saldo en Clientes enlaza a sus ventas; "Ver venta" al terminar en el punto de venta

### ✅ Fase 5 — Órdenes de servicio
- [x] 5.1 Recepción y seguimiento (`features/ordenes`, rutas `/servicios`)
  - [x] Recibir equipo `/servicios/nueva`: cliente obligatorio, equipo, marca (sugerida del catálogo), modelo, serie, accesorios, falla, técnico, fecha prometida, presupuesto y garantía. Crea la `Venta` SERVICIO `ABIERTA` (sin boleta) y la orden OS01
  - [x] Lista con contadores (en curso, listas, vencidas) y filtros: búsqueda (n°, cliente, equipo, serie), estado, "en curso", "vencidas", técnico y fechas
  - [x] Detalle con historial; editar datos (los cambios de técnico, presupuesto, diagnóstico, fecha y cliente quedan en el historial)
  - [x] Estados: hacia adelante a cualquiera del taller o un paso atrás; al salir de "listo" se limpia `fechaListo`. "Entregado" se hará en 5.2
  - [x] Técnico: usuarios activos admin o vendedor
  - [x] Cancelar (admin, con motivo): solo sin servicios, repuestos ni adelantos; la venta queda `ANULADA` sin número y no aparece en `/ventas`
- [x] 5.2 Cobro y entrega
  - [x] Servicios del catálogo y repuestos: el repuesto descuenta stock al agregarse (kardex `VENTA`) y vuelve al quitarse (`ANULACION_VENTA`); mismo precio mínimo que el punto de venta (admin auditado)
  - [x] Adelantos con `registrarCobro`/`anularPagoVenta` sobre la venta abierta. No pueden superar el total: hay que agregar servicios o repuestos antes, y no se puede quitar una línea si los adelantos quedarían por encima
  - [x] Entregar (`entregarOrden`): exige al menos una línea, emite la boleta B001, cobra en el acto (opcional, con vuelto) y deja el resto en cuentas por cobrar
  - [x] **Decisión:** el saldo de una orden solo cuenta como deuda al entregarla (clientes y cuentas por cobrar usan solo ventas `EMITIDA`)
  - [x] Ticket de recepción `/imprimir/orden/[id]` (80 mm, fuera del layout); enlace orden ↔ boleta en ambos detalles
  - [ ] Pendiente: anular la boleta de una orden ya entregada (hoy se bloquea con un mensaje)

### ✅ Fase 6 — Impresión y WhatsApp
- [x] `/imprimir/venta/[id]` y `/imprimir/orden/[id]` sin layout, con `@page` de 58 mm, 80 mm o A4 según `formatoTicket`; se abre el diálogo de impresión al cargar
- [x] Boleta con el título configurado, datos de la tienda, monto en letras (`src/lib/letras.ts`), pagos y vuelto; marca "ANULADA"
- [x] Imprimir y WhatsApp al terminar en el punto de venta, en el detalle de la venta y en la orden (ticket)
- [x] WhatsApp sin API (`wa.me`): opcional; pide o sugiere el celular, el mensaje es editable y se abre WhatsApp listo para enviar
- [x] Enlace público con código aleatorio de 24 caracteres (`tokenPublico`, se crea al compartir): `/b/[token]` boleta y `/o/[token]` estado de la orden, sin sesión y sin costos ni celular. Solo se incluye si el sistema es accesible desde internet (`APP_URL` o host de la petición)
- [ ] (Opcional) etiquetas con código de barras

### ✅ Fase 7 — Dashboard y reportes
- [x] Inicio según el rol: vendido y recibido hoy (el vendedor, lo suyo), por cobrar, órdenes en curso/listas/vencidas, stock bajo, deuda con proveedores y gráfico de los últimos 14 días (admin)
- [x] `/reportes` con pestañas por permiso (`features/reportes/permisos.ts`); periodo con accesos rápidos (hoy, semana, mes, mes anterior, año) y rango libre; por defecto el mes en curso
  - Ventas: total, ticket promedio, dinero recibido, utilidad y margen (solo `reporte:utilidad`), gráfico por día (por mes si pasa de 62 días), por método, por vendedor y detalle. El vendedor (`ventasPropias`) solo ve lo suyo
  - Más vendidos (por importe o por unidades), compras por proveedor y cuentas por pagar, inventario valorizado por tipo y stock bajo
- [x] Exportar a Excel (.xlsx con `exceljs`, `src/lib/excel.ts`): `/api/reportes/{ventas|productos|compras|inventario|cuentas-por-cobrar}` con el mismo control de permisos, fila de totales con fórmulas y fechas en hora de Lima
- Agregación por día en SQL con `AT TIME ZONE 'America/Lima'`; la utilidad usa el costo guardado en cada línea de venta

### ✅ Fase 8 — Uso diario
- [x] **Caja diaria** (`features/caja`, `/caja`): apertura con fondo (sugiere lo contado en el último cierre), ingresos y retiros con concepto, cierre con arqueo (esperado, contado, diferencia, auditoría de faltantes y sobrantes) e historial (`caja:historial`, solo admin)
  - Esperado = fondo + cobros en efectivo − reembolsos en efectivo + ingresos − retiros, por el periodo de la caja (apertura → cierre). Al cerrar se guarda una foto (`resumen` JSON)
  - Una sola caja abierta (índice único parcial). Un retiro no puede dejar la caja en negativo
  - No es obligatoria: el punto de venta avisa si está cerrada. Los pagos a proveedores en efectivo **no** se descuentan solos: se registran como retiro
- [x] **Devoluciones parciales** (`registrarDevolucion`, permiso `venta:devolver`, solo admin): por línea y cantidad; lo que vuelve en buen estado reingresa al stock (kardex `DEVOLUCION_VENTA`), lo dañado no
  - Rebaja el total; si lo pagado supera el nuevo total, se reembolsa la diferencia por el método elegido (en efectivo sale de la caja)
  - `VentaDetalle.cantidadDevuelta`/`montoDevuelto`: los reportes usan cantidades netas y el dinero recibido resta los reembolsos
  - Una venta con devoluciones ya no se anula (se devuelve lo que queda); no se anula un pago ya reembolsado

### ✅ Publicación y ajustes posteriores
- [x] **Publicado en Vercel** (`balanzasv1.vercel.app`) desde GitHub. Variables: `DATABASE_URL`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL` y `APP_URL` (las dos últimas = la URL de Vercel). Usa **la misma BD de Neon** que el desarrollo local
- [x] `npm run build` ahora es `prisma generate && next build` (Vercel no tiene `generated/prisma`, que está en `.gitignore`)
- [x] **Celular:** en venta, compra y ajustes de inventario cada producto se muestra como tarjeta (campos uno debajo de otro) y como fila de tabla cuando hay espacio; depende del ancho de la tarjeta (`@container`), no de la pantalla
- [x] **Bucle de redirecciones** (`ERR_TOO_MANY_REDIRECTS`): pasaba con una cookie de sesión revocada (ej. al cambiar la clave se cierran las otras sesiones). `proxy.ts` ya no saca del login por tener cookie; la página de login verifica la sesión real con `getSession()` y solo redirige si es válida. `destinoSeguro` está en `src/lib/redirect.ts`

- [x] **Detalle de orden de servicio se caía** (`Cannot read properties of null (reading 'id')`): el diálogo "Quitar de la orden" estaba siempre montado con `quitar!.id` y el React Compiler leía `quitar.id` en cada render. Ahora se monta solo con una línea elegida

### Pendientes sueltos
- Anular la boleta de una orden de servicio ya entregada
- (Opcional) etiquetas con código de barras
- Mejoras propuestas aún no pedidas: cotizaciones/proformas, gastos de la tienda, instalar como app (PWA), pantalla de auditoría
- Recomendado antes del uso real: separar la BD de producción (rama en Neon), revisar copias de seguridad de Neon, plan de Vercel para uso comercial, limpiar datos de prueba
