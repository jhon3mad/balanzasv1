"use client";

import { useState } from "react";
import { Combobox, ComboboxContent, ComboboxEmpty, ComboboxInput, ComboboxItem, ComboboxList } from "@/components/ui/combobox";

export type PickerItem = { id: number; label: string; codigo: string; detalle?: string };

type Props<T extends PickerItem> = {
  items: T[];
  onSelect: (item: T) => void;
  placeholder?: string;
  /** Ids ya agregados (se muestran deshabilitados) */
  excluidos?: number[];
};

/** Buscador de productos/presentaciones por nombre o código. Al elegir, se limpia para seguir agregando. */
export function PresentacionPicker<T extends PickerItem>({
  items,
  onSelect,
  placeholder = "Buscar producto por nombre o código…",
  excluidos = [],
}: Props<T>) {
  const [texto, setTexto] = useState("");

  return (
    <Combobox<T>
      items={items}
      value={null}
      inputValue={texto}
      onInputValueChange={setTexto}
      itemToStringLabel={(item) => item.label}
      isItemEqualToValue={(a, b) => a.id === b.id}
      onValueChange={(item) => {
        if (item) {
          onSelect(item);
          setTexto("");
        }
      }}
      limit={50}
    >
      <ComboboxInput placeholder={placeholder} className="w-full" />
      <ComboboxContent>
        <ComboboxEmpty>No se encontraron productos.</ComboboxEmpty>
        <ComboboxList>
          {(item: T) => (
            <ComboboxItem key={item.id} value={item} disabled={excluidos.includes(item.id)}>
              <div className="flex min-w-0 flex-col">
                <span className="truncate">{item.label}</span>
                {item.detalle && <span className="text-xs text-muted-foreground">{item.detalle}</span>}
              </div>
            </ComboboxItem>
          )}
        </ComboboxList>
      </ComboboxContent>
    </Combobox>
  );
}
