"use client";

import { Input } from "@/components/ui/input";
import { useUrlParams } from "@/hooks/use-url-params";

/** Filtro "desde / hasta" guardado en la URL (?desde=YYYY-MM-DD&hasta=YYYY-MM-DD). */
export function DateRangeFilter() {
  const { searchParams, setParams } = useUrlParams();
  return (
    <div className="flex items-center gap-2">
      <Input
        type="date"
        aria-label="Desde"
        className="w-full sm:w-38"
        value={searchParams.get("desde") ?? ""}
        onChange={(e) => setParams({ desde: e.target.value || null })}
      />
      <span className="text-sm text-muted-foreground">a</span>
      <Input
        type="date"
        aria-label="Hasta"
        className="w-full sm:w-38"
        value={searchParams.get("hasta") ?? ""}
        onChange={(e) => setParams({ hasta: e.target.value || null })}
      />
    </div>
  );
}
