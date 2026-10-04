import {
  BarChart3Icon,
  BoxesIcon,
  ClipboardListIcon,
  HandCoinsIcon,
  HistoryIcon,
  HouseIcon,
  PackageIcon,
  ReceiptTextIcon,
  SettingsIcon,
  ShoppingCartIcon,
  TagsIcon,
  TruckIcon,
  UserRoundIcon,
  UsersIcon,
  WrenchIcon,
  type LucideIcon,
} from "lucide-react";
import { rolTienePermiso, type Permisos } from "@/lib/permissions";

export type NavItem = {
  titulo: string;
  href: string;
  icono: LucideIcon;
  /** Basta con cumplir uno de estos permisos. Sin permisos = visible para todos. */
  permisos?: Permisos[];
  /** false = módulo aún no implementado (se muestra deshabilitado). */
  disponible: boolean;
};

export type NavGroup = { titulo: string; items: NavItem[] };

export const NAVEGACION: NavGroup[] = [
  {
    titulo: "General",
    items: [{ titulo: "Inicio", href: "/", icono: HouseIcon, disponible: true }],
  },
  {
    titulo: "Ventas",
    items: [
      { titulo: "Punto de venta", href: "/ventas/nueva", icono: ShoppingCartIcon, permisos: [{ venta: ["crear"] }], disponible: true },
      { titulo: "Ventas", href: "/ventas", icono: ReceiptTextIcon, permisos: [{ venta: ["ver"] }], disponible: true },
      { titulo: "Órdenes de servicio", href: "/servicios", icono: WrenchIcon, permisos: [{ ordenServicio: ["ver"] }], disponible: true },
      { titulo: "Cuentas por cobrar", href: "/cuentas-por-cobrar", icono: HandCoinsIcon, permisos: [{ venta: ["cobrar"] }], disponible: true },
      { titulo: "Clientes", href: "/clientes", icono: UserRoundIcon, permisos: [{ cliente: ["ver"] }], disponible: true },
    ],
  },
  {
    titulo: "Almacén",
    items: [
      { titulo: "Productos", href: "/productos", icono: PackageIcon, permisos: [{ producto: ["ver"] }], disponible: true },
      { titulo: "Inventario", href: "/inventario/stock", icono: BoxesIcon, permisos: [{ inventario: ["ver"] }], disponible: true },
      { titulo: "Kardex", href: "/inventario/kardex", icono: HistoryIcon, permisos: [{ inventario: ["verKardex"] }], disponible: true },
      { titulo: "Compras", href: "/compras", icono: ClipboardListIcon, permisos: [{ compra: ["ver"] }], disponible: true },
      { titulo: "Proveedores", href: "/proveedores", icono: TruckIcon, permisos: [{ proveedor: ["ver"] }], disponible: true },
    ],
  },
  {
    titulo: "Administración",
    items: [
      { titulo: "Catálogos", href: "/catalogos", icono: TagsIcon, permisos: [{ catalogo: ["gestionar"] }], disponible: true },
      {
        titulo: "Reportes",
        href: "/reportes",
        icono: BarChart3Icon,
        permisos: [{ reporte: ["ventas"] }, { reporte: ["ventasPropias"] }, { reporte: ["compras"] }, { reporte: ["inventario"] }],
        disponible: true,
      },
      { titulo: "Usuarios", href: "/usuarios", icono: UsersIcon, permisos: [{ user: ["list"] }], disponible: true },
      { titulo: "Configuración", href: "/configuracion", icono: SettingsIcon, permisos: [{ configuracion: ["editar"] }], disponible: true },
    ],
  },
];

export function puedeVer(item: NavItem, rol: string | null | undefined): boolean {
  if (!item.permisos) return true;
  return item.permisos.some((p) => rolTienePermiso(rol, p));
}

/** Navegación filtrada según el rol (los grupos vacíos se ocultan). */
export function navegacionParaRol(rol: string | null | undefined): NavGroup[] {
  return NAVEGACION.map((g) => ({ ...g, items: g.items.filter((i) => puedeVer(i, rol)) })).filter(
    (g) => g.items.length > 0,
  );
}
