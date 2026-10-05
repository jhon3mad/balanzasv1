import type { Metadata } from "next";
import { redirect as redirigir } from "next/navigation";
import { ScaleIcon } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { destinoSeguro } from "@/lib/redirect";
import { getSession } from "@/lib/session";
import { getConfiguracion } from "@/features/configuracion/queries";
import { LoginForm } from "@/features/auth/components/login-form";

export const metadata: Metadata = { title: "Iniciar sesión" };

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const [{ redirect }, config, session] = await Promise.all([searchParams, getConfiguracion(), getSession()]);
  const destino = typeof redirect === "string" ? redirect : undefined;

  // Sesión válida (verificada en la base de datos): no tiene sentido mostrar el login.
  // Con una cookie vencida o revocada, getSession devuelve null y se muestra el formulario.
  if (session) redirigir(session.user.mustChangePassword ? "/cambiar-clave" : destinoSeguro(destino));

  return (
    <Card>
      <CardHeader className="items-center text-center">
        <div className="mx-auto mb-2 flex size-12 items-center justify-center rounded-xl bg-primary text-primary-foreground">
          {config.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- logo guardado como data URL
            <img src={config.logoUrl} alt="" className="size-12 rounded-xl object-cover" />
          ) : (
            <ScaleIcon className="size-6" />
          )}
        </div>
        <CardTitle className="text-xl">{config.nombreComercial}</CardTitle>
        <CardDescription>Ingresa con tu usuario y contraseña</CardDescription>
      </CardHeader>
      <CardContent>
        <LoginForm redirect={destino} />
      </CardContent>
    </Card>
  );
}
