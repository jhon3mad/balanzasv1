"use client";

import { useRef } from "react";
import { ImageIcon, Trash2Icon, UploadIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { notify } from "@/lib/notify";

const TIPOS = ["image/png", "image/jpeg", "image/webp"];
const MAX_BYTES = 300 * 1024;

type Props = {
  value: string;
  onChange: (dataUrl: string) => void;
  invalid?: boolean;
};

export function LogoInput({ value, onChange, invalid }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);

  const seleccionar = (archivo: File | undefined) => {
    if (!archivo) return;
    if (!TIPOS.includes(archivo.type)) {
      notify.error("Formato no permitido", "Usa una imagen PNG, JPG o WEBP.");
      return;
    }
    if (archivo.size > MAX_BYTES) {
      notify.error("Imagen muy pesada", "El logo no debe pesar más de 300 KB.");
      return;
    }
    const lector = new FileReader();
    lector.onload = () => {
      if (typeof lector.result === "string") onChange(lector.result);
    };
    lector.readAsDataURL(archivo);
  };

  return (
    <div className="flex items-center gap-4">
      <div
        className="flex size-20 shrink-0 items-center justify-center overflow-hidden rounded-xl border bg-muted aria-invalid:border-destructive"
        aria-invalid={invalid}
      >
        {value ? (
          // eslint-disable-next-line @next/next/no-img-element -- vista previa de data URL
          <img src={value} alt="Logo de la tienda" className="size-full object-contain" />
        ) : (
          <ImageIcon className="size-8 text-muted-foreground" />
        )}
      </div>
      <div className="flex flex-col gap-2">
        <div className="flex gap-2">
          <Button type="button" variant="outline" size="sm" onClick={() => inputRef.current?.click()}>
            <UploadIcon />
            {value ? "Cambiar" : "Subir logo"}
          </Button>
          {value && (
            <Button type="button" variant="ghost" size="sm" onClick={() => onChange("")}>
              <Trash2Icon />
              Quitar
            </Button>
          )}
        </div>
        <p className="text-xs text-muted-foreground">PNG, JPG o WEBP, máximo 300 KB. Se usa en el sistema y los comprobantes.</p>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept={TIPOS.join(",")}
        className="hidden"
        onChange={(e) => {
          seleccionar(e.target.files?.[0]);
          e.target.value = "";
        }}
      />
    </div>
  );
}
