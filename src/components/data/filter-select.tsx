"use client";

import { SelectField, type Opcion } from "@/components/form/select-field";
import { useUrlParams } from "@/hooks/use-url-params";

type Props = {
  param: string;
  opciones: Opcion[];
  /** Texto de la opción que quita el filtro */
  todos: string;
  className?: string;
};

/** Filtro tipo select que se guarda en la URL. */
export function FilterSelect({ param, opciones, todos, className }: Props) {
  const { searchParams, setParams } = useUrlParams();
  return (
    <SelectField
      value={searchParams.get(param) ?? ""}
      onChange={(v) => setParams({ [param]: v || null })}
      opciones={opciones}
      opcionVacia={todos}
      placeholder={todos}
      className={className ?? "w-full sm:w-44"}
    />
  );
}
