import type { ConfiguracionDTO } from "@/features/configuracion/queries";
import { ESTADO_ORDEN_LABELS } from "@/features/ordenes/constants";
import type { OrdenDetalleDTO } from "@/features/ordenes/queries";
import { formatFecha, formatFechaHora } from "@/lib/dates";
import { formatPEN } from "@/lib/money";
import { cn } from "@/lib/utils";
import { DOCUMENTO, esTicket, type FormatoImpresion } from "../formato";
import { EncabezadoTienda } from "./encabezado-tienda";

function Fila({ label, valor }: { label: string; valor: React.ReactNode }) {
  if (valor === null || valor === undefined || valor === "") return null;
  return (
    <div>
      <span className="font-semibold">{label}: </span>
      <span className="whitespace-pre-line">{valor}</span>
    </div>
  );
}

type Props = {
  orden: OrdenDetalleDTO;
  config: ConfiguracionDTO;
  formato: FormatoImpresion;
  /** Página pública: muestra el estado actual y lo cobrado, sin la línea de firma */
  consulta?: boolean;
};

/** Ticket de recepción del equipo (y vista de consulta para el cliente). */
export function TicketOrden({ orden, config, formato, consulta }: Props) {
  const ticket = esTicket(formato);
  const separador = cn("mt-2 grid gap-0.5 border-t border-black pt-2", ticket && "border-dashed");

  return (
    <article className={cn("bg-white text-black", DOCUMENTO[formato])}>
      <EncabezadoTienda config={config} ticket={ticket} />

      <div className={cn("my-2 border-y border-black py-1 text-center", ticket && "border-dashed")}>
        <div className="font-bold">ORDEN DE SERVICIO</div>
        <div className={cn("font-bold", ticket ? "text-sm" : "text-lg")}>{orden.numero}</div>
        <div>Recibido: {formatFechaHora(orden.fechaRecepcion)}</div>
      </div>

      {consulta && (
        <div className="my-2 rounded border-2 border-black p-2 text-center">
          <div className="text-[0.9em]">Estado actual</div>
          <div className="text-base font-bold uppercase">{ESTADO_ORDEN_LABELS[orden.estado]}</div>
          {orden.estado === "LISTO" && <div>¡Tu equipo está listo para recoger!</div>}
        </div>
      )}

      <section className="grid gap-0.5">
        <Fila label="Cliente" valor={orden.cliente} />
        <Fila label="Doc." valor={orden.clienteDocumento} />
        {!consulta && <Fila label="Cel." valor={orden.clienteTelefono} />}
      </section>

      <section className={separador}>
        <Fila label="Equipo" valor={orden.equipo} />
        <Fila label="Marca/modelo" valor={orden.marcaModelo} />
        <Fila label="N° serie" valor={orden.numeroSerie} />
        <Fila label="Accesorios" valor={orden.accesorios ?? "Ninguno"} />
        <Fila label="Falla" valor={orden.fallaReportada} />
        {consulta && <Fila label="Diagnóstico" valor={orden.diagnostico} />}
      </section>

      {consulta && orden.lineas.length > 0 && (
        <section className={separador}>
          {orden.lineas.map((l) => (
            <div key={l.id} className="flex justify-between gap-2">
              <span>
                {l.cantidad} x {l.descripcion}
              </span>
              <span className="tabular-nums">{formatPEN(l.subtotal)}</span>
            </div>
          ))}
          <div className="flex justify-between gap-2 font-bold">
            <span>TOTAL</span>
            <span className="tabular-nums">{formatPEN(orden.total)}</span>
          </div>
        </section>
      )}

      <section className={separador}>
        {!(consulta && orden.lineas.length > 0) && (
          <Fila label="Presupuesto" valor={orden.presupuesto ? formatPEN(orden.presupuesto) : "Por definir"} />
        )}
        <Fila label={orden.boleta ? "Pagado" : "Adelanto"} valor={Number(orden.montoPagado) > 0 ? formatPEN(orden.montoPagado) : null} />
        {consulta && Number(orden.saldo) > 0 && <Fila label="Saldo" valor={formatPEN(orden.saldo)} />}
        <Fila label="Fecha prometida" valor={orden.fechaPrometida ? formatFecha(orden.fechaPrometida) : null} />
        <Fila label="Garantía" valor={orden.garantiaDias != null ? `${orden.garantiaDias} días` : null} />
        {consulta && <Fila label="Boleta" valor={orden.boleta} />}
        {!consulta && <Fila label="Atendió" valor={orden.recibidoPor} />}
      </section>

      <footer className={cn("mt-3 border-t border-black pt-2 text-center", ticket && "border-dashed")}>
        {!consulta && <div>Presente este ticket para recoger su equipo.</div>}
        {config.piePagina && <div className="mt-1 whitespace-pre-line">{config.piePagina}</div>}
        {!consulta && (
          <>
            <div className="mt-6">______________________</div>
            <div>Firma del cliente</div>
          </>
        )}
      </footer>
    </article>
  );
}
