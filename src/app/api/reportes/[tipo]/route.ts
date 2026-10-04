import { getSession } from "@/lib/session";
import { agregarHoja, crearLibro, respuestaExcel, type Columna } from "@/lib/excel";
import { TIPO_PRODUCTO_LABELS } from "@/features/productos/constants";
import { cuentasPorCobrar } from "@/features/ventas/queries";
import { alcanceReportes } from "@/features/reportes/permisos";
import { periodoDe } from "@/features/reportes/periodo";
import {
  cobrosPorMetodo,
  comprasPorProveedor,
  cuentasPorPagar,
  listadoVentas,
  masVendidos,
  stockBajo,
  valorizadoPorTipo,
  ventasEnElTiempo,
  ventasPorVendedor,
  type MasVendido,
  type VentaReporte,
  type VentasVendedor,
} from "@/features/reportes/queries";

const utilidad = (total: string, costo: string) => Number(total) - Number(costo);

/** Descarga de reportes en Excel: /api/reportes/{ventas|productos|compras|inventario|cuentas-por-cobrar}?desde=&hasta= */
export async function GET(request: Request, { params }: RouteContext<"/api/reportes/[tipo]">) {
  const session = await getSession();
  if (!session) return new Response("Inicia sesión para descargar reportes.", { status: 401 });
  if (session.user.mustChangePassword) return new Response("Cambia tu contraseña primero.", { status: 403 });

  const a = alcanceReportes(session.user.role);
  const { tipo } = await params;
  const url = new URL(request.url);
  const p = periodoDe(url.searchParams.get("desde") ?? undefined, url.searchParams.get("hasta") ?? undefined);
  const sufijo = `${p.desde}_a_${p.hasta}`;
  const titulo = (nombre: string) => `${nombre} del ${p.desde.split("-").reverse().join("/")} al ${p.hasta.split("-").reverse().join("/")}`;
  const libro = crearLibro();
  const sinPermiso = () => new Response("No tienes permiso para este reporte.", { status: 403 });

  switch (tipo) {
    case "ventas": {
      if (!a.ventas && !a.soloPropias) return sinPermiso();
      // El vendedor solo descarga lo suyo; el admin puede filtrar por vendedor
      const vendedorId = a.soloPropias ? session.user.id : url.searchParams.get("vendedor") || undefined;
      const [tiempo, metodos, listado, vendedores] = await Promise.all([
        ventasEnElTiempo(p, vendedorId),
        cobrosPorMetodo(p, vendedorId),
        listadoVentas(p, vendedorId),
        a.ventas ? ventasPorVendedor(p) : Promise.resolve([] as VentasVendedor[]),
      ]);
      const conUtilidad = a.utilidad;
      agregarHoja(
        libro,
        tiempo.agrupacion === "dia" ? "Por día" : "Por mes",
        [
          { titulo: tiempo.agrupacion === "dia" ? "Día" : "Mes", valor: (f) => f.clave, ancho: 12 },
          { titulo: "Ventas", valor: (f) => f.ventas, formato: "entero" },
          { titulo: "Total", valor: (f) => f.total, formato: "moneda", ancho: 14 },
          ...(conUtilidad
            ? [
                { titulo: "Costo", valor: (f: (typeof tiempo.puntos)[number]) => f.costo, formato: "moneda" as const, ancho: 14 },
                { titulo: "Utilidad", valor: (f: (typeof tiempo.puntos)[number]) => utilidad(f.total, f.costo), formato: "moneda" as const, ancho: 14 },
              ]
            : []),
        ],
        tiempo.puntos,
        { titulo: titulo("Ventas"), totales: ["Ventas", "Total", "Costo", "Utilidad"] },
      );
      if (a.ventas) {
        agregarHoja<VentasVendedor>(
          libro,
          "Por vendedor",
          [
            { titulo: "Vendedor", valor: (f) => f.vendedor, ancho: 28 },
            { titulo: "Ventas", valor: (f) => f.ventas, formato: "entero" },
            { titulo: "Total", valor: (f) => f.total, formato: "moneda", ancho: 14 },
            { titulo: "Saldo por cobrar", valor: (f) => f.saldo, formato: "moneda", ancho: 16 },
            ...(conUtilidad ? [{ titulo: "Utilidad", valor: (f: VentasVendedor) => utilidad(f.total, f.costo), formato: "moneda" as const, ancho: 14 }] : []),
          ],
          vendedores,
          { titulo: titulo("Ventas por vendedor"), totales: ["Ventas", "Total", "Saldo por cobrar", "Utilidad"] },
        );
      }
      agregarHoja(
        libro,
        "Cobros por método",
        [
          { titulo: "Método", valor: (f) => f.metodo, ancho: 20 },
          { titulo: "Pagos", valor: (f) => f.pagos, formato: "entero" },
          { titulo: "Monto", valor: (f) => f.monto, formato: "moneda", ancho: 14 },
        ],
        metodos,
        { titulo: titulo(a.soloPropias ? "Lo que cobré" : "Dinero recibido"), totales: ["Pagos", "Monto"] },
      );
      agregarHoja<VentaReporte>(
        libro,
        "Boletas",
        [
          { titulo: "N°", valor: (f) => f.numero, ancho: 16 },
          { titulo: "Fecha", valor: (f) => f.fecha, formato: "fechaHora", ancho: 17 },
          { titulo: "Cliente", valor: (f) => f.cliente, ancho: 30 },
          { titulo: "Vendedor", valor: (f) => f.vendedor, ancho: 22 },
          { titulo: "Tipo", valor: (f) => f.tipo },
          { titulo: "Estado", valor: (f) => f.estado, ancho: 14 },
          { titulo: "Total", valor: (f) => (f.estado === "Anulada" ? 0 : f.total), formato: "moneda", ancho: 14 },
          { titulo: "Pagado", valor: (f) => (f.estado === "Anulada" ? 0 : f.pagado), formato: "moneda", ancho: 14 },
          { titulo: "Saldo", valor: (f) => (f.estado === "Anulada" ? 0 : f.saldo), formato: "moneda", ancho: 14 },
          ...(conUtilidad
            ? [{ titulo: "Utilidad", valor: (f: VentaReporte) => (f.estado === "Anulada" ? 0 : utilidad(f.total, f.costo)), formato: "moneda" as const, ancho: 14 }]
            : []),
        ],
        listado,
        { titulo: titulo("Boletas emitidas (las anuladas suman 0)"), totales: ["Total", "Pagado", "Saldo", "Utilidad"] },
      );
      return respuestaExcel(libro, `ventas_${sufijo}`);
    }

    case "productos": {
      if (!a.ventas) return sinPermiso();
      const filas = await masVendidos(p, url.searchParams.get("orden") === "cantidad" ? "cantidad" : "importe", 1000);
      agregarHoja<MasVendido>(
        libro,
        "Más vendidos",
        [
          { titulo: "Tipo", valor: (f) => (f.tipo === "SERVICIO" ? "Servicio" : "Producto") },
          { titulo: "Código", valor: (f) => f.codigo, ancho: 14 },
          { titulo: "Descripción", valor: (f) => f.descripcion, ancho: 40 },
          { titulo: "Cantidad", valor: (f) => f.cantidad, formato: "entero" },
          { titulo: "Ventas", valor: (f) => f.ventas, formato: "entero" },
          { titulo: "Importe", valor: (f) => f.total, formato: "moneda", ancho: 14 },
          ...(a.utilidad ? [{ titulo: "Utilidad", valor: (f: MasVendido) => utilidad(f.total, f.costo), formato: "moneda" as const, ancho: 14 }] : []),
        ],
        filas,
        { titulo: titulo("Más vendidos"), totales: ["Cantidad", "Importe", "Utilidad"] },
      );
      return respuestaExcel(libro, `mas_vendidos_${sufijo}`);
    }

    case "compras": {
      if (!a.compras) return sinPermiso();
      const [porProveedor, deudas] = await Promise.all([comprasPorProveedor(p), cuentasPorPagar()]);
      agregarHoja(
        libro,
        "Compras por proveedor",
        [
          { titulo: "Proveedor", valor: (f) => f.proveedor, ancho: 34 },
          { titulo: "Compras", valor: (f) => f.compras, formato: "entero" },
          { titulo: "Total", valor: (f) => f.total, formato: "moneda", ancho: 14 },
          { titulo: "Pagado", valor: (f) => f.pagado, formato: "moneda", ancho: 14 },
          { titulo: "Saldo", valor: (f) => f.saldo, formato: "moneda", ancho: 14 },
        ],
        porProveedor,
        { titulo: titulo("Compras recibidas"), totales: ["Compras", "Total", "Pagado", "Saldo"] },
      );
      agregarHoja(
        libro,
        "Cuentas por pagar",
        [
          { titulo: "Proveedor", valor: (f) => f.proveedor, ancho: 34 },
          { titulo: "Compras con saldo", valor: (f) => f.compras, formato: "entero", ancho: 18 },
          { titulo: "Más antigua", valor: (f) => f.masAntigua, formato: "fecha", ancho: 14 },
          { titulo: "Saldo", valor: (f) => f.saldo, formato: "moneda", ancho: 14 },
        ],
        deudas,
        { titulo: "Cuentas por pagar (a la fecha)", totales: ["Saldo"] },
      );
      return respuestaExcel(libro, `compras_${sufijo}`);
    }

    case "inventario": {
      if (!a.inventario) return sinPermiso();
      const [tipos, bajo] = await Promise.all([valorizadoPorTipo(), stockBajo(5000)]);
      agregarHoja(
        libro,
        "Valorizado",
        [
          { titulo: "Tipo", valor: (f) => TIPO_PRODUCTO_LABELS[f.tipo], ancho: 16 },
          { titulo: "Presentaciones", valor: (f) => f.items, formato: "entero", ancho: 15 },
          { titulo: "Unidades", valor: (f) => f.unidades, formato: "entero" },
          { titulo: "Valor al costo", valor: (f) => f.valor, formato: "moneda", ancho: 16 },
          { titulo: "Valor a precio de venta", valor: (f) => f.valorVenta, formato: "moneda", ancho: 22 },
        ],
        tipos,
        { titulo: "Inventario valorizado (a la fecha)", totales: ["Presentaciones", "Unidades", "Valor al costo", "Valor a precio de venta"] },
      );
      agregarHoja(
        libro,
        "Stock bajo",
        [
          { titulo: "Código", valor: (f) => f.codigo, ancho: 14 },
          { titulo: "Producto", valor: (f) => f.producto, ancho: 40 },
          { titulo: "Stock", valor: (f) => f.stock, formato: "entero" },
          { titulo: "Mínimo", valor: (f) => f.stockMinimo, formato: "entero" },
          { titulo: "Costo promedio", valor: (f) => f.costo, formato: "moneda", ancho: 15 },
        ],
        bajo,
        { titulo: "Productos en o bajo el stock mínimo" },
      );
      return respuestaExcel(libro, `inventario_${p.hasta}`);
    }

    case "cuentas-por-cobrar": {
      if (!a.cuentasPorCobrar) return sinPermiso();
      const { clientes } = await cuentasPorCobrar({});
      type Fila = (typeof clientes)[number];
      const columnas: Columna<Fila>[] = [
        { titulo: "Cliente", valor: (f) => f.nombre, ancho: 34 },
        { titulo: "Documento", valor: (f) => f.documento, ancho: 16 },
        { titulo: "Celular", valor: (f) => f.telefono, ancho: 14 },
        { titulo: "Ventas con saldo", valor: (f) => f.ventas, formato: "entero", ancho: 16 },
        { titulo: "Más antigua", valor: (f) => new Date(f.masAntigua), formato: "fecha", ancho: 14 },
        { titulo: "Días", valor: (f) => f.dias, formato: "entero" },
        { titulo: "Saldo", valor: (f) => f.saldo, formato: "moneda", ancho: 14 },
      ];
      agregarHoja(libro, "Cuentas por cobrar", columnas, clientes, { titulo: "Cuentas por cobrar (a la fecha)", totales: ["Saldo"] });
      return respuestaExcel(libro, `cuentas_por_cobrar_${p.hasta}`);
    }

    default:
      return new Response("Reporte no encontrado.", { status: 404 });
  }
}
