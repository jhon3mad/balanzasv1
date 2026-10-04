"use client";

import { useState } from "react";
import { UserPlusIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Combobox, ComboboxContent, ComboboxEmpty, ComboboxInput, ComboboxItem, ComboboxList } from "@/components/ui/combobox";
import { ClienteDialog } from "@/features/clientes/components/cliente-dialog";
import type { ClienteVentaOpcion } from "../queries";

type Props = {
  clientes: ClienteVentaOpcion[];
  value: ClienteVentaOpcion | null;
  onChange: (cliente: ClienteVentaOpcion | null) => void;
  /** Agrega un cliente recién creado a la lista */
  onCreado: (cliente: ClienteVentaOpcion) => void;
  puedeCrear: boolean;
  invalid?: boolean;
};

const etiqueta = (c: ClienteVentaOpcion) => (c.documento ? `${c.nombre} · ${c.documento}` : c.nombre);

export function ClienteSelector({ clientes, value, onChange, onCreado, puedeCrear, invalid }: Props) {
  const [nuevo, setNuevo] = useState(false);
  const [texto, setTexto] = useState("");

  return (
    <div className="flex gap-2">
      <Combobox<ClienteVentaOpcion>
        items={clientes}
        value={value}
        onValueChange={(c) => onChange(c ?? null)}
        inputValue={texto}
        onInputValueChange={setTexto}
        itemToStringLabel={etiqueta}
        isItemEqualToValue={(a, b) => a.id === b.id}
        filter={(c, q) => {
          const query = q.trim().toLowerCase();
          if (!query) return true;
          return [c.nombre, c.documento ?? "", c.telefono ?? ""].some((v) => v.toLowerCase().includes(query));
        }}
        limit={50}
      >
        <ComboboxInput
          placeholder="Cliente general (buscar por nombre, DNI o celular)"
          className="min-w-0 flex-1"
          showClear={!!value}
          aria-invalid={invalid}
        />
        <ComboboxContent>
          <ComboboxEmpty>No se encontró el cliente.</ComboboxEmpty>
          <ComboboxList>
            {(c: ClienteVentaOpcion) => (
              <ComboboxItem key={c.id} value={c}>
                <div className="flex min-w-0 flex-col">
                  <span className="truncate">{c.nombre}</span>
                  <span className="text-xs text-muted-foreground">
                    {[c.documento, c.telefono].filter(Boolean).join(" · ") || "Sin documento"}
                  </span>
                </div>
              </ComboboxItem>
            )}
          </ComboboxList>
        </ComboboxContent>
      </Combobox>
      {puedeCrear && (
        <Button type="button" variant="outline" size="icon" aria-label="Nuevo cliente" title="Nuevo cliente" onClick={() => setNuevo(true)}>
          <UserPlusIcon />
        </Button>
      )}
      {nuevo && (
        <ClienteDialog
          nombreInicial={value ? "" : texto}
          onClose={() => setNuevo(false)}
          onSaved={(c) => {
            const cliente = { id: c.id, nombre: c.nombre, documento: c.documento, telefono: c.telefono };
            onCreado(cliente);
            onChange(cliente);
            setTexto(etiqueta(cliente));
          }}
        />
      )}
    </div>
  );
}
