import { PAGINA, type FormatoImpresion } from "../formato";
import { BotonImprimir } from "./boton-imprimir";

type Props = {
  formato: FormatoImpresion;
  /** Abre el diálogo de impresión al cargar (no en la página pública) */
  autoImprimir?: boolean;
  textoBoton?: string;
  /** Contenido extra sobre el documento (solo en pantalla) */
  encabezado?: React.ReactNode;
  children: React.ReactNode;
};

/** Contenedor de una página imprimible: fondo gris en pantalla, papel limpio al imprimir. */
export function HojaImpresion({ formato, autoImprimir, textoBoton, encabezado, children }: Props) {
  return (
    <div className="flex min-h-full flex-col items-center gap-4 bg-neutral-100 px-4 py-6 print:block print:bg-white print:p-0">
      <style>{PAGINA[formato]}</style>
      <div className="flex w-full max-w-md flex-col items-center gap-2 text-center print:hidden">
        {encabezado}
        <BotonImprimir autoImprimir={autoImprimir} texto={textoBoton} />
      </div>
      <div className="max-w-full overflow-x-auto bg-white p-4 shadow print:overflow-visible print:p-0 print:shadow-none">{children}</div>
    </div>
  );
}
