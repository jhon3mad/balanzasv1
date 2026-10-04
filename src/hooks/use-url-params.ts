"use client";

import { useCallback, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

/**
 * Lee y actualiza parámetros de la URL (filtros, búsqueda, página).
 * Al cambiar un filtro se vuelve a la página 1.
 */
export function useUrlParams() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();

  const setParams = useCallback(
    (cambios: Record<string, string | null>, { resetPage = true } = {}) => {
      const params = new URLSearchParams(searchParams.toString());
      for (const [clave, valor] of Object.entries(cambios)) {
        if (valor === null || valor === "") params.delete(clave);
        else params.set(clave, valor);
      }
      if (resetPage && !("page" in cambios)) params.delete("page");
      const qs = params.toString();
      startTransition(() => router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false }));
    },
    [pathname, router, searchParams],
  );

  return { searchParams, setParams, pending };
}
