import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { Separator } from "@/components/ui/separator";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { getConfiguracion } from "@/features/configuracion/queries";
import { requireSession } from "@/lib/session";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await requireSession();
  if (session.user.mustChangePassword) redirect("/cambiar-clave");

  const [config, cookieStore] = await Promise.all([getConfiguracion(), cookies()]);
  const sidebarAbierto = cookieStore.get("sidebar_state")?.value !== "false";

  return (
    <SidebarProvider defaultOpen={sidebarAbierto}>
      <AppSidebar
        tienda={{ nombre: config.nombreComercial, logoUrl: config.logoUrl }}
        usuario={{
          name: session.user.name,
          username: session.user.username ?? null,
          role: session.user.role ?? null,
        }}
      />
      <SidebarInset>
        <header className="sticky top-0 z-10 flex h-14 shrink-0 items-center gap-2 border-b bg-background/95 px-4 backdrop-blur">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 data-[orientation=vertical]:h-4" />
          <span className="truncate text-sm font-medium text-muted-foreground">{config.nombreComercial}</span>
        </header>
        <div className="flex flex-1 flex-col gap-6 p-4 md:p-6">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  );
}
