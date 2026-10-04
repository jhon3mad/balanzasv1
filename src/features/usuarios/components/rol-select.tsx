"use client";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ROL_LABELS, ROLES, type Rol } from "@/lib/permissions";

const DESCRIPCIONES: Record<Rol, string> = {
  admin: "Acceso total al sistema",
  vendedor: "Ventas, cobros, clientes y servicios",
  almacenero: "Compras, recepciones e inventario",
};

type Props = {
  id?: string;
  value: string | undefined;
  onChange: (value: Rol) => void;
  invalid?: boolean;
  disabled?: boolean;
};

export function RolSelect({ id, value, onChange, invalid, disabled }: Props) {
  return (
    <Select
      items={ROL_LABELS}
      value={value ?? null}
      onValueChange={(v) => {
        if (v) onChange(v as Rol);
      }}
      disabled={disabled}
    >
      <SelectTrigger id={id} className="w-full" aria-invalid={invalid}>
        <SelectValue placeholder="Selecciona un rol" />
      </SelectTrigger>
      <SelectContent>
        {ROLES.map((rol) => (
          <SelectItem key={rol} value={rol}>
            <div className="flex flex-col">
              <span>{ROL_LABELS[rol]}</span>
              <span className="text-xs text-muted-foreground">{DESCRIPCIONES[rol]}</span>
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
