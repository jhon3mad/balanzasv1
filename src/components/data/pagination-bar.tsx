"use client";

import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useUrlParams } from "@/hooks/use-url-params";

type Props = { page: number; pageSize: number; total: number };

export function PaginationBar({ page, pageSize, total }: Props) {
  const { setParams, pending } = useUrlParams();
  const paginas = Math.max(1, Math.ceil(total / pageSize));
  const desde = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const hasta = Math.min(page * pageSize, total);

  const ir = (p: number) => setParams({ page: p > 1 ? String(p) : null }, { resetPage: false });

  return (
    <div className="flex flex-col items-center justify-between gap-2 text-sm text-muted-foreground sm:flex-row">
      <span>
        {total === 0 ? "Sin resultados" : `Mostrando ${desde}–${hasta} de ${total}`}
      </span>
      {paginas > 1 && (
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" disabled={page <= 1 || pending} onClick={() => ir(page - 1)}>
            <ChevronLeftIcon />
            Anterior
          </Button>
          <span className="tabular-nums">
            {page} / {paginas}
          </span>
          <Button variant="outline" size="sm" disabled={page >= paginas || pending} onClick={() => ir(page + 1)}>
            Siguiente
            <ChevronRightIcon />
          </Button>
        </div>
      )}
    </div>
  );
}
