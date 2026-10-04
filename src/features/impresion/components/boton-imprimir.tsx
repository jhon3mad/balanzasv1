"use client";

import { useEffect } from "react";
import { PrinterIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

/** Botón de imprimir; con autoImprimir abre el diálogo al cargar la página. */
export function BotonImprimir({ autoImprimir = false, texto = "Imprimir" }: { autoImprimir?: boolean; texto?: string }) {
  useEffect(() => {
    if (!autoImprimir) return;
    const t = setTimeout(() => window.print(), 300);
    return () => clearTimeout(t);
  }, [autoImprimir]);

  return (
    <Button onClick={() => window.print()}>
      <PrinterIcon />
      {texto}
    </Button>
  );
}
