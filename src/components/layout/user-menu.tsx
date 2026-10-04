"use client";

import { useTransition } from "react";
import Link from "next/link";
import { ChevronsUpDownIcon, KeyRoundIcon, LogOutIcon } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SidebarMenu, SidebarMenuButton, SidebarMenuItem, useSidebar } from "@/components/ui/sidebar";
import { logoutAction } from "@/features/auth/actions";
import { isRol, ROL_LABELS } from "@/lib/permissions";

export type UsuarioMenu = {
  name: string;
  username: string | null;
  role: string | null;
};

export function iniciales(nombre: string) {
  return nombre
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");
}

export function UserMenu({ usuario }: { usuario: UsuarioMenu }) {
  const { isMobile } = useSidebar();
  const [pending, startTransition] = useTransition();
  const rol = isRol(usuario.role) ? ROL_LABELS[usuario.role] : "Sin rol";

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger
            render={<SidebarMenuButton size="lg" className="data-popup-open:bg-sidebar-accent" />}
          >
            <Avatar className="size-8 rounded-lg">
              <AvatarFallback className="rounded-lg">{iniciales(usuario.name)}</AvatarFallback>
            </Avatar>
            <div className="grid flex-1 text-left text-sm leading-tight">
              <span className="truncate font-medium">{usuario.name}</span>
              <span className="truncate text-xs text-muted-foreground">{rol}</span>
            </div>
            <ChevronsUpDownIcon className="ml-auto size-4" />
          </DropdownMenuTrigger>
          <DropdownMenuContent side={isMobile ? "bottom" : "right"} align="end" sideOffset={4} className="min-w-56">
            <DropdownMenuGroup>
              <DropdownMenuLabel className="font-normal">
                <div className="grid text-sm leading-tight">
                  <span className="truncate font-medium text-foreground">{usuario.name}</span>
                  <span className="truncate text-xs">@{usuario.username}</span>
                </div>
              </DropdownMenuLabel>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem render={<Link href="/cambiar-clave" />}>
              <KeyRoundIcon />
              Cambiar contraseña
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              variant="destructive"
              disabled={pending}
              onClick={() => startTransition(() => logoutAction())}
            >
              <LogOutIcon />
              Cerrar sesión
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
