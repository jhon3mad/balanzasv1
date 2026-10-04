"use client";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export type Opcion = { value: string; label: string };

type Props = {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  opciones: Opcion[];
  placeholder?: string;
  /** Si se indica, agrega una opción para dejar el campo vacío ("") con este texto. */
  opcionVacia?: string;
  invalid?: boolean;
  disabled?: boolean;
  className?: string;
};

/** Select controlado por string ("" = sin selección), pensado para usarse con Controller. */
export function SelectField({
  id,
  value,
  onChange,
  opciones,
  placeholder = "Selecciona…",
  opcionVacia,
  invalid,
  disabled,
  className,
}: Props) {
  const items = [...(opcionVacia ? [{ value: null, label: opcionVacia }] : []), ...opciones];
  return (
    <Select
      items={items}
      value={value === "" ? null : value}
      onValueChange={(v) => onChange(typeof v === "string" ? v : "")}
      disabled={disabled}
    >
      <SelectTrigger id={id} className={className ?? "w-full"} aria-invalid={invalid}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {opcionVacia && (
          <SelectItem value={null} className="text-muted-foreground">
            {opcionVacia}
          </SelectItem>
        )}
        {opciones.map((o) => (
          <SelectItem key={o.value} value={o.value}>
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
