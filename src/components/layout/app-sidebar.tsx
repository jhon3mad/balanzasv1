"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ScaleIcon } from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar";
import { navegacionParaRol, type NavItem } from "@/config/navigation";
import { UserMenu, type UsuarioMenu } from "./user-menu";

type Props = {
  tienda: { nombre: string; logoUrl: string | null };
  usuario: UsuarioMenu;
};

function coincide(href: string, pathname: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

/** Activo solo el ítem que mejor coincide (ej. /inventario/kardex marca "Kardex", no "Inventario"). */
function itemActivo(items: NavItem[], pathname: string): string | null {
  let mejor: string | null = null;
  for (const item of items) {
    // Las pestañas de inventario (ajustes) pertenecen a "Inventario"
    const base = item.href === "/inventario/stock" ? "/inventario" : item.href;
    if (coincide(base, pathname) && (!mejor || base.length > mejor.length)) mejor = base;
  }
  return mejor;
}

function estaActivo(item: NavItem, activo: string | null) {
  return (item.href === "/inventario/stock" ? "/inventario" : item.href) === activo;
}

export function AppSidebar({ tienda, usuario }: Props) {
  const pathname = usePathname();
  const grupos = navegacionParaRol(usuario.role);
  const activo = itemActivo(
    grupos.flatMap((g) => g.items),
    pathname,
  );

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" render={<Link href="/" />}>
              <div className="flex aspect-square size-8 items-center justify-center overflow-hidden rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                {tienda.logoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element -- logo guardado como data URL
                  <img src={tienda.logoUrl} alt="" className="size-8 object-cover" />
                ) : (
                  <ScaleIcon className="size-4" />
                )}
              </div>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-semibold">{tienda.nombre}</span>
                <span className="truncate text-xs text-muted-foreground">Sistema de ventas</span>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        {grupos.map((grupo) => (
          <SidebarGroup key={grupo.titulo}>
            <SidebarGroupLabel>{grupo.titulo}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {grupo.items.map((item) => (
                  <SidebarMenuItem key={item.href}>
                    {item.disponible ? (
                      <SidebarMenuButton
                        isActive={estaActivo(item, activo)}
                        tooltip={item.titulo}
                        render={<Link href={item.href} />}
                      >
                        <item.icono />
                        <span>{item.titulo}</span>
                      </SidebarMenuButton>
                    ) : (
                      <>
                        <SidebarMenuButton disabled tooltip={`${item.titulo} (próximamente)`} className="opacity-50">
                          <item.icono />
                          <span>{item.titulo}</span>
                        </SidebarMenuButton>
                        <SidebarMenuBadge className="text-[10px] text-muted-foreground">Pronto</SidebarMenuBadge>
                      </>
                    )}
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>

      <SidebarFooter>
        <UserMenu usuario={usuario} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
