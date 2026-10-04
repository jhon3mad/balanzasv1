"use client";

import { useEffect, useRef, useState } from "react";
import { SearchIcon } from "lucide-react";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import { Spinner } from "@/components/ui/spinner";
import { useUrlParams } from "@/hooks/use-url-params";

type Props = { placeholder?: string; param?: string; className?: string };

/** Búsqueda que actualiza la URL (?q=) con un pequeño retraso mientras se escribe. */
export function SearchInput({ placeholder = "Buscar…", param = "q", className }: Props) {
  const { searchParams, setParams, pending } = useUrlParams();
  const [valor, setValor] = useState(searchParams.get(param) ?? "");
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => () => clearTimeout(timer.current), []);

  return (
    <InputGroup className={className ?? "w-full sm:max-w-xs"}>
      <InputGroupAddon>{pending ? <Spinner /> : <SearchIcon />}</InputGroupAddon>
      <InputGroupInput
        type="search"
        placeholder={placeholder}
        value={valor}
        onChange={(e) => {
          const nuevo = e.target.value;
          setValor(nuevo);
          clearTimeout(timer.current);
          timer.current = setTimeout(() => setParams({ [param]: nuevo.trim() || null }), 350);
        }}
      />
    </InputGroup>
  );
}
