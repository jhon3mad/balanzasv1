import type { Metadata } from "next";
import Link from "next/link";
import { KeyRoundIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { requireSession } from "@/lib/session";
import { CambiarClaveForm } from "@/features/auth/components/cambiar-clave-form";
import { logoutAction } from "@/features/auth/actions";

export const metadata: Metadata = { title: "Cambiar contraseña" };

export default async function CambiarClavePage() {
  const session = await requireSession();
  const obligatorio = session.user.mustChangePassword;

  return (
    <Card>
      <CardHeader className="text-center">
        <div className="mx-auto mb-2 flex size-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <KeyRoundIcon className="size-6" />
        </div>
        <CardTitle className="text-xl">Cambiar contraseña</CardTitle>
        <CardDescription>
          {obligatorio
            ? `Hola ${session.user.name}, por seguridad debes crear una nueva contraseña antes de continuar.`
            : "Ingresa tu contraseña actual y la nueva."}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <CambiarClaveForm />
      </CardContent>
      <CardFooter className="justify-center">
        {obligatorio ? (
          <form action={logoutAction}>
            <Button type="submit" variant="link">
              Cerrar sesión
            </Button>
          </form>
        ) : (
          <Button variant="link" nativeButton={false} render={<Link href="/" />}>
            Volver al inicio
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}
