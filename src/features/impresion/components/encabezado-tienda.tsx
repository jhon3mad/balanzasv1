import type { ConfiguracionDTO } from "@/features/configuracion/queries";
import { cn } from "@/lib/utils";

/** Logo y datos de la tienda en la cabecera de boletas y tickets. */
export function EncabezadoTienda({ config, ticket }: { config: ConfiguracionDTO; ticket: boolean }) {
  return (
    <header className={cn("flex flex-col items-center text-center", !ticket && "items-start text-left")}>
      {config.logoUrl && (
        // eslint-disable-next-line @next/next/no-img-element -- logo subido por la tienda, URL arbitraria
        <img src={config.logoUrl} alt="" className={cn("mb-1 object-contain", ticket ? "max-h-14" : "max-h-20")} />
      )}
      <div className={cn("font-bold uppercase", ticket ? "text-sm" : "text-xl")}>{config.nombreComercial}</div>
      {config.razonSocial && <div>{config.razonSocial}</div>}
      {config.ruc && <div>RUC {config.ruc}</div>}
      {config.direccion && <div>{config.direccion}</div>}
      {(config.telefono || config.email) && <div>{[config.telefono && `Tel. ${config.telefono}`, config.email].filter(Boolean).join(" · ")}</div>}
    </header>
  );
}
