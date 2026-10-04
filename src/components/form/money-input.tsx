"use client";

import { InputGroup, InputGroupAddon, InputGroupInput, InputGroupText } from "@/components/ui/input-group";

/** Input de soles: texto con teclado decimal y prefijo "S/". */
export function MoneyInput(props: Omit<React.ComponentProps<"input">, "type" | "inputMode">) {
  return (
    <InputGroup>
      <InputGroupAddon>
        <InputGroupText>S/</InputGroupText>
      </InputGroupAddon>
      <InputGroupInput inputMode="decimal" placeholder="0.00" autoComplete="off" {...props} />
    </InputGroup>
  );
}

/** Input numérico con unidad al final (kg, g, V, etc.). */
export function UnitInput({ unidad, ...props }: Omit<React.ComponentProps<"input">, "type"> & { unidad: string }) {
  return (
    <InputGroup>
      <InputGroupInput inputMode="decimal" autoComplete="off" {...props} />
      <InputGroupAddon align="inline-end">
        <InputGroupText>{unidad}</InputGroupText>
      </InputGroupAddon>
    </InputGroup>
  );
}
