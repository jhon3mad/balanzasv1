import type { Metadata } from "next";
import Link from "next/link";
import { ShieldXIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";

export const metadata: Metadata = { title: "Acceso denegado" };

export default function SinPermisoPage() {
  return (
    <Empty className="flex-1">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <ShieldXIcon />
        </EmptyMedia>
        <EmptyTitle>Acceso denegado</EmptyTitle>
        <EmptyDescription>Tu rol no tiene permiso para ver esta sección. Si crees que es un error, consulta con el administrador.</EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <Button nativeButton={false} render={<Link href="/" />}>
          Volver al inicio
        </Button>
      </EmptyContent>
    </Empty>
  );
}
