// Textos que se envían por WhatsApp. *texto* = negrita en WhatsApp.
import type { OrdenDetalleDTO } from "@/features/ordenes/queries";
import type { VentaDetalleDTO } from "@/features/ventas/queries";
import { ESTADO_ORDEN_LABELS } from "@/features/ordenes/constants";
import { formatFecha, formatFechaHora } from "@/lib/dates";
import { formatPEN } from "@/lib/money";

type Tienda = { nombreComercial: string; tituloComprobante: string };

/** Máximo de líneas de productos en el mensaje (el resto se ve en el enlace). */
const MAX_LINEAS = 12;

const primerNombre = (nombre: string | null) => nombre?.trim().split(/\s+/)[0] ?? null;

export function mensajeVenta(venta: VentaDetalleDTO, tienda: Tienda, enlace: string | null): string {
  const nombre = primerNombre(venta.cliente);
  const lineas = venta.lineas
    .slice(0, MAX_LINEAS)
    .map((l) => `• ${l.cantidad} x ${l.descripcion} — ${formatPEN(l.subtotal)}${l.cantidadDevuelta > 0 ? ` (devuelto: ${l.cantidadDevuelta})` : ""}`);
  if (venta.lineas.length > MAX_LINEAS) lineas.push(`• … y ${venta.lineas.length - MAX_LINEAS} más`);
  const saldo = Number(venta.saldo) > 0;

  return [
    nombre ? `Hola ${nombre}, gracias por tu compra en *${tienda.nombreComercial}*.` : `Gracias por tu compra en *${tienda.nombreComercial}*.`,
    "",
    `*${tienda.tituloComprobante} ${venta.numero}*`,
    `Fecha: ${formatFechaHora(venta.fechaEmision)}`,
    "",
    ...lineas,
    "",
    `*Total: ${formatPEN(venta.total)}*`,
    ...(saldo ? [`Pagado: ${formatPEN(venta.montoPagado)}`, `*Saldo pendiente: ${formatPEN(venta.saldo)}*`] : []),
    ...(enlace ? ["", `Ver y descargar tu boleta: ${enlace}`] : []),
  ].join("\n");
}

export function mensajeOrden(orden: OrdenDetalleDTO, tienda: Tienda, enlace: string | null): string {
  const nombre = primerNombre(orden.cliente);
  const estado = ESTADO_ORDEN_LABELS[orden.estado];
  const total = Number(orden.total) > 0;

  return [
    nombre ? `Hola ${nombre}, te escribimos de *${tienda.nombreComercial}*.` : `Te escribimos de *${tienda.nombreComercial}*.`,
    "",
    `*Orden de servicio ${orden.numero}*`,
    `Equipo: ${orden.equipo}${orden.marcaModelo ? ` (${orden.marcaModelo})` : ""}`,
    `Estado: *${estado}*`,
    ...(orden.estado === "LISTO" ? ["¡Tu equipo ya está listo para recoger!"] : []),
    ...(orden.fechaPrometida && orden.estado !== "LISTO" && orden.estado !== "ENTREGADO"
      ? [`Fecha prometida: ${formatFecha(orden.fechaPrometida)}`]
      : []),
    ...(total
      ? [`Total: ${formatPEN(orden.total)}`, ...(Number(orden.saldo) > 0 ? [`Saldo: ${formatPEN(orden.saldo)}`] : [])]
      : orden.presupuesto
        ? [`Presupuesto: ${formatPEN(orden.presupuesto)}`]
        : []),
    ...(enlace ? ["", `Consulta tu orden: ${enlace}`] : []),
  ].join("\n");
}
