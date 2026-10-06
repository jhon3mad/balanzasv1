# Sistema de ventas para tiendas de balanzas

Sistema web para una tienda de balanzas y accesorios en Perú: catálogo con presentaciones, compras a proveedores, inventario con kardex, punto de venta con pagos mixtos o por partes, y boletas internas (sin SUNAT). Se instala **una vez por tienda** (una BD por tienda, sin multi-tenant). Todo el sistema está en **español**: textos, mensajes, nombres de dominio y comentarios.

- **Plan y avance por fases:** [docs/PLAN.md](docs/PLAN.md). Léelo para saber qué sigue.
- El usuario prefiere **avanzar por pasos chicos**: proponer el siguiente paso y esperar a que elija.

## Stack
Next.js 16 (App Router, `src/proxy.ts` en lugar de middleware) · React 19 + React Compiler · TypeScript estricto · Prisma 7 (`prisma-client` con salida en `generated/prisma`, `@prisma/adapter-pg`) · PostgreSQL (Neon) · better-auth 1.7 (plugins `username` y `admin`) · Zod 4 (mensajes en español) · react-hook-form + `@hookform/resolvers` · shadcn estilo `base-nova` sobre **base-ui** (no Radix).

## Comandos
```bash
npm run dev                      # desarrollo (puerto 3000; el usuario suele tenerlo abierto)
npx tsc --noEmit                 # tipos
npx eslint src                   # lint (debe quedar en 0 errores y 0 warnings)
npm run build                    # build de producción (incluye prisma generate, necesario en Vercel)
npx next typegen                 # regenera tipos de rutas (PageProps<"/ruta">) tras crear páginas
npx prisma migrate dev --name x  # migración; con Prisma 7 luego hay que ejecutar:
npx prisma generate              # (migrate dev ya no genera el cliente)
npx prisma db seed               # datos base idempotentes (tsx prisma/seed.ts)
```
- `prisma migrate reset` está bloqueado para agentes: requiere consentimiento explícito del usuario.
- Los CHECK de la BD se agregan a mano en el SQL de la migración (`--create-only`, editar y aplicar).
- Si `migrate dev` se niega por ser no interactivo (advertencias), escribir el SQL en `prisma/migrations/<fecha>_<nombre>/migration.sql`, aplicar con `npx prisma migrate deploy` y verificar con `npx prisma migrate diff --from-config-datasource --to-schema prisma/schema.prisma --script` (debe salir vacío).
- `APP_URL` (opcional, producción): URL pública para los enlaces de WhatsApp. Sin ella se usa el host de la petición; en localhost/red local no se envía enlace.

## Estructura
```
src/app/(auth)/                 login, cambiar-clave (sin sidebar)
src/app/(app)/                  páginas con sidebar; layout exige sesión y redirige si mustChangePassword
src/app/imprimir/               hojas de impresión sin layout (exigen sesión y permiso en la página)
src/app/b, src/app/o            boleta y orden PÚBLICAS por `tokenPublico` (en RUTAS_PUBLICAS de proxy.ts); no mostrar costos ni datos internos
src/features/<modulo>/          schemas.ts · queries.ts · actions.ts · service.ts · constants.ts · components/
src/lib/                        auth, permissions, session, safe-action, prisma, money, dates, stock,
                                correlativo, auditoria, estados, validation, notify, search-params
src/components/ui/              shadcn (no editar salvo correcciones puntuales)
src/components/form|data|layout componentes propios reutilizables
src/config/navigation.ts        menú por rol (`disponible: false` = módulo aún no hecho)
prisma/schema.prisma            esquema completo (todas las tablas ya existen, incluidas ventas y órdenes de servicio)
```

## Convenciones (seguirlas en todo módulo nuevo)

### Mutaciones
- **Server Actions** con `createAction({ schema, permission, handler })` de `src/lib/safe-action.ts`. Este envoltorio:
  - verifica sesión y permisos y valida con Zod;
  - convierte `AppError`, errores de better-auth y Prisma (P2002, P2003, P2025) en `ActionResult` con mensaje en español.
- Las respuestas se arman con `ok(data, mensaje)` y `fail(mensaje, fieldErrors)`.
- En el cliente se usa `handleActionResult(result, form.setError)` de `src/lib/notify.ts`, que muestra el toast y los errores por campo.

### Lógica de negocio
- Va en `features/*/service.ts`, sin `server-only`, para poder probarla con tsx.
- Todo lo que toca stock o dinero va en `prisma.$transaction`.

### Lecturas
- Van en `queries.ts` (con `import "server-only"`) y devuelven **DTOs serializables**: Decimal → string con `decimalATexto`, fechas en ISO.

### Formularios
- RHF + `zodResolver`.
- Si el esquema transforma valores, se tipa como `useForm<Input, unknown, Output>` y se envía `form.getValues()`: el servidor vuelve a validar.
- Componentes: `FormField`, `MoneyInput`/`UnitInput`, `SelectField` (`""` = vacío) y `PresentacionPicker` (combobox de productos).
- `useFieldArray` siempre con `keyName: "key"`, para no pisar el `id` real de cada línea.
- Usar `useWatch` en lugar de `form.watch` (lo exige el React Compiler).
- **React Compiler y valores que pueden ser `null`:** nunca `x!.prop` dentro de un callback de un componente siempre montado (ej. `<ConfirmDialog open={!!x} onConfirm={() => accion(x!.id)} />`). El compilador lee `x.prop` en cada render para memorizar el callback y la página se cae en el navegador con `Cannot read properties of null`. Montar el diálogo solo cuando hay valor: `{x && <Dialogo open … />}`. Las pruebas por HTTP no lo detectan (solo ven el HTML del servidor; el error es al hidratar en el navegador).
- **Listas de productos editables (se usan desde el celular):** no usar `<Table>` con inputs. Usar una sola versión con `@container`: en angosto, tarjeta con los campos uno debajo de otro; en ancho, grid tipo tabla (`@xl:`/`@4xl:`/`@5xl:grid-cols-[…]` y envoltorios `@…:contents`). Ver `punto-venta.tsx`, `compra-form.tsx` y `ajuste-form.tsx`. Las clases de columnas deben escribirse completas (Tailwind no detecta clases armadas en tiempo de ejecución).

### Números
- Los números de los formularios viajan como **string**: `decimalTexto`, `enteroTexto` y sus variantes opcionales en `src/lib/validation.ts`.
- En el servidor se calcula con `Prisma.Decimal`.
- En pantalla se calcula en céntimos con `aCentimos` y `deCentimos` de `src/lib/money.ts`.

### Permisos
- Están definidos en código en `src/lib/permissions.ts` con `createAccessControl`.
- Roles: `admin`, `vendedor` y `almacenero`.
- En páginas se usa `requirePermission({...})`, que redirige a `/sin-permiso`.
- Para mostrar u ocultar botones se usa `rolTienePermiso(rol, {...})`.

### Stock
- Siempre con `bloquearPresentacion(tx, id)` de `src/lib/stock.ts` (`SELECT … FOR UPDATE`).
- Cada cambio de stock registra un `MovimientoInventario` (kardex) con `stockAnterior` y `stockNuevo` coherentes.
- El costo promedio se calcula con `nuevoCostoPromedio`.
- Si hay varias presentaciones, se bloquean ordenadas por id.

### Otras reglas
- **Correlativos:** `siguienteNumero(tx, "BOLETA" | "COMPRA" | "ORDEN_SERVICIO")` de `src/lib/correlativo.ts`, dentro de la misma transacción. Se muestran con `formatearNumero` → `B001-00000001`.
- **Fechas:** se guardan en UTC y se muestran en America/Lima.
  - `hoyLima()` y `fechaLimaADate()` para inputs date.
  - `rangoFechasLima()` para filtros.
  - `formatFecha()` y `formatFechaHora()` para mostrar.
- **Listados:**
  - filtros y paginación en la URL con `SearchInput`, `FilterSelect`, `DateRangeFilter` y `PaginationBar` (hook `useUrlParams`);
  - en el servidor se leen con `paramTexto`, `paramEnum`, `paramId` y `paramPagina`.
- **No se borra historial:** lo que tiene movimientos se desactiva (`activo`) o se anula con motivo, y queda en `registrarAuditoria`.
- **Relaciones opcionales:** en el esquema llevan `onDelete: Restrict`. Prisma pone `SET NULL` por defecto, lo que causó un bug.
- **Botón que renderiza un enlace:** `<Button nativeButton={false} render={<Link href=… />}>`.
- **`proxy.ts` solo ve si EXISTE la cookie de sesión, no si es válida** (no consulta la BD). Nunca redirigir *desde* el login por tener cookie: una cookie revocada causa un bucle login ↔ inicio. La validez la decide `getSession()` en las páginas (el login redirige solo si la sesión es válida).

## Pruebas (importante: no tocar los datos del usuario)
- No hay suite automatizada. Cada módulo se valida con un script temporal `prisma/_e2eN.ts` que se ejecuta con `npx tsx` y se borra al terminar. Ese script:
  - prueba esquemas y servicios directamente;
  - prueba las pantallas por HTTP según el rol.
- **Servidor de prueba propio:** después de `npm run build` se levanta con `npx next start -p 3100`, porque el 3000 es el dev del usuario. Hay que confirmar que respondió antes de probar.
- En el login de prueba se envía `origin: http://localhost:3000`, el origen de confianza de better-auth. El limitador de login permite unos 3 intentos cada 10 s, así que hay que esperar 11 s entre tandas.
- **Usuarios temporales** `admin_t`, `vend_t`, `alma_t` y datos con prefijo `ZZTEST`. Al terminar se borran, y se restaura el `ultimoNumero` de las series usadas.
- **Nunca** modificar al usuario `admin` real (su clave ya no es la del seed) ni ejecutar `session.deleteMany({})` global.
- En el HTML de React aparecen `<!-- -->` entre fragmentos de texto: hay que quitarlos antes de buscar texto.

## Reglas de negocio clave
- **Producto y presentación:** el producto es el modelo, con características según su tipo (balanza, batería, enchufe, sensor…). La **presentación** es lo que se vende y tiene stock: código de caja, código de barras, precio de venta, **precio mínimo**, costo promedio y stock.
- **Compras:** pedido → recepción. El stock sube al recibir; si llegó menos, el total se ajusta a lo recibido. Los pagos al proveedor se registran aparte. Para anular una compra recibida hay que anular antes los pagos, y se bloquea si el stock ya no alcanza.
- **Ventas** (`features/ventas/service.ts` `crearVenta`):
  - el stock se descuenta al emitir;
  - el vendedor no puede vender bajo el precio mínimo (el admin sí, y queda auditado);
  - **el cliente es obligatorio** si queda saldo o no se entrega en el acto; si no, va "Cliente general" (`clienteId` null);
  - los pagos mixtos son varias filas `Pago`; el vuelto se calcula con `montoRecibido` y solo aplica a efectivo;
  - la boleta B001 se asigna en la misma transacción.
- **Orden de servicio:** es una `Venta` de tipo `SERVICIO`, en estado `ABIERTA` hasta emitirse, más la tabla 1:1 `OrdenServicio`.
- **Devoluciones:** lo vendido neto de una línea es `cantidad − cantidadDevuelta` (y `subtotal − montoDevuelto`); toda consulta de cantidades, utilidad o "más vendidos" debe usar los netos. El dinero recibido resta `Devolucion.montoReembolso`.
- **Caja:** el efectivo esperado se calcula por ventana de tiempo (apertura → cierre) sobre `pago` y `devolucion`; no hay `cajaId` en los pagos.
- **Base de datos compartida:** el sistema publicado en Vercel usa la misma BD de Neon que el desarrollo. Las migraciones se aplican a producción en el acto: deben ser solo aditivas (nada que rompa el código ya desplegado).
- **Permisos por rol:**
  - **Almacenero:** ve costos, compra, recibe y ajusta inventario. No vende ni crea productos.
  - **Vendedor:** vende, cobra y gestiona clientes. No ve costos.
