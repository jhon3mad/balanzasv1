"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export type TabNav = { href: string; titulo: string };

/** Pestañas basadas en rutas (cada pestaña es una URL). */
export function TabsNav({ tabs }: { tabs: TabNav[] }) {
  const pathname = usePathname();
  return (
    <nav className="-mx-1 flex gap-1 overflow-x-auto border-b px-1" aria-label="Secciones">
      {tabs.map((tab) => {
        const activo = pathname === tab.href || pathname.startsWith(`${tab.href}/`);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            aria-current={activo ? "page" : undefined}
            className={cn(
              "-mb-px border-b-2 px-3 py-2 text-sm font-medium whitespace-nowrap transition-colors",
              activo
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            {tab.titulo}
          </Link>
        );
      })}
    </nav>
  );
}
