import type { Metadata } from "next";
import { ScaleIcon } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getConfiguracion } from "@/features/configuracion/queries";
import { LoginForm } from "@/features/auth/components/login-form";

export const metadata: Metadata = { title: "Iniciar sesión" };

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const [{ redirect }, config] = await Promise.all([searchParams, getConfiguracion()]);

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
        <LoginForm redirect={typeof redirect === "string" ? redirect : undefined} />
      </CardContent>
    </Card>
  );
}
