import type { ConfiguracionDTO } from "@/features/configuracion/queries";
import type { VentaDetalleDTO } from "@/features/ventas/queries";
import { formatFechaHora } from "@/lib/dates";
import { montoEnLetras } from "@/lib/letras";
import { aCentimos, deCentimos, formatPEN } from "@/lib/money";
import { cn } from "@/lib/utils";
import { DOCUMENTO, esTicket, type FormatoImpresion } from "../formato";
import { EncabezadoTienda } from "./encabezado-tienda";

type Props = { venta: VentaDetalleDTO; config: ConfiguracionDTO; formato: FormatoImpresion };

const Separador = ({ ticket }: { ticket: boolean }) => (
  <div className={cn("my-2 border-t border-black", ticket && "border-dashed")} />
);

function Linea({ label, valor, fuerte }: { label: string; valor: string; fuerte?: boolean }) {
  return (
    <div className={cn("flex justify-between gap-2", fuerte && "font-bold")}>
      <span>{label}</span>
      <span className="tabular-nums">{valor}</span>
    </div>
  );
}

/** Boleta (o nota de venta) lista para imprimir o mostrar en el enlace público. */
export function BoletaDocumento({ venta, config, formato }: Props) {
  const ticket = esTicket(formato);
  const anulada = venta.estado === "ANULADA";
  const pagos = venta.pagos.filter((p) => !p.anulado);
  const descuento = aCentimos(venta.descuento);
  const vuelto = pagos.reduce((s, p) => s + (p.montoRecibido ? aCentimos(p.montoRecibido) - aCentimos(p.monto) : 0), 0);

  return (
    <article className={cn("relative bg-white text-black", DOCUMENTO[formato])}>
      {anulada && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <span className="-rotate-30 border-4 border-red-600 px-3 text-3xl font-black tracking-widest text-red-600 opacity-60">
            ANULADA
          </span>
        </div>
      )}

      <div className={cn(!ticket && "flex items-start justify-between gap-6")}>
        <EncabezadoTienda config={config} ticket={ticket} />
        <div className={cn("text-center", ticket ? "mt-2 border-y border-dashed border-black py-1" : "shrink-0 rounded border-2 border-black px-6 py-3")}>
          <div className="font-bold uppercase">{config.tituloComprobante}</div>
          <div className={cn("font-bold", ticket ? "text-sm" : "text-lg")}>{venta.numero}</div>
        </div>
      </div>

      <div className={cn("mt-2 grid gap-0.5", !ticket && "mt-6 grid-cols-2")}>
        <div>
          <span className="font-semibold">Fecha: </span>
          {formatFechaHora(venta.fechaEmision)}
        </div>
        <div>
          <span className="font-semibold">Cliente: </span>
          {venta.cliente ?? "Cliente general"}
        </div>
        {venta.clienteDocumento && (
          <div>
            <span className="font-semibold">Doc.: </span>
            {venta.clienteDocumento}
          </div>
        )}
        <div>
          <span className="font-semibold">Atendió: </span>
          {venta.vendedor}
        </div>
        {venta.orden && (
          <div>
            <span className="font-semibold">Orden de servicio: </span>
            {venta.orden.numero}
          </div>
        )}
      </div>

      <Separador ticket={ticket} />

      {ticket ? (
        <div className="grid gap-1">
          {venta.lineas.map((l) => (
            <div key={l.id}>
              <div>{l.descripcion}</div>
              <div className="flex justify-between gap-2 tabular-nums">
                <span>
                  {l.cantidad} x {formatPEN(l.precioUnitario)}
                </span>
                <span>{formatPEN(l.subtotal)}</span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b border-black text-left">
              <th className="py-1 pr-2 font-semibold">Cant.</th>
              <th className="py-1 pr-2 font-semibold">Descripción</th>
              <th className="py-1 pr-2 text-right font-semibold">P. unit.</th>
              <th className="py-1 text-right font-semibold">Importe</th>
            </tr>
          </thead>
          <tbody>
            {venta.lineas.map((l) => (
              <tr key={l.id} className="border-b border-black/20 align-top">
                <td className="py-1 pr-2 tabular-nums">{l.cantidad}</td>
                <td className="py-1 pr-2">
                  {l.descripcion}
                  {l.codigo && <span className="text-xs text-black/60"> · {l.codigo}</span>}
                </td>
                <td className="py-1 pr-2 text-right tabular-nums">{formatPEN(l.precioUnitario)}</td>
                <td className="py-1 text-right tabular-nums">{formatPEN(l.subtotal)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <Separador ticket={ticket} />

      <div className={cn("grid gap-0.5", !ticket && "ml-auto w-72")}>
        {descuento > 0 && (
          <>
            <Linea label="Precio de lista" valor={formatPEN(venta.totalLista)} />
            <Linea label="Descuento" valor={`-${formatPEN(venta.descuento)}`} />
          </>
        )}
        <Linea label="TOTAL" valor={formatPEN(venta.total)} fuerte />
      </div>
      <div className="mt-1 text-[0.9em]">{montoEnLetras(venta.total)}</div>

      {!anulada && (
        <>
          <Separador ticket={ticket} />
          <div className={cn("grid gap-0.5", !ticket && "ml-auto w-72")}>
            {pagos.map((p) => (
              <Linea key={p.id} label={p.metodo} valor={formatPEN(p.monto)} />
            ))}
            {vuelto > 0 && <Linea label="Vuelto" valor={formatPEN(deCentimos(vuelto))} />}
            {Number(venta.saldo) > 0 && <Linea label="SALDO PENDIENTE" valor={formatPEN(venta.saldo)} fuerte />}
          </div>
        </>
      )}

      {(config.piePagina || !anulada) && (
        <footer className="mt-3 text-center">
          {config.piePagina ? <div className="whitespace-pre-line">{config.piePagina}</div> : <div>¡Gracias por su compra!</div>}
        </footer>
      )}
    </article>
  );
}
