import { rolTienePermiso } from "@/lib/permissions";

export type AlcanceReportes = {
  /** Ventas de todos (admin) */
  ventas: boolean;
  /** Solo las ventas propias (vendedor): se fuerza el filtro por usuario */
  soloPropias: boolean;
  utilidad: boolean;
  compras: boolean;
  inventario: boolean;
  cuentasPorCobrar: boolean;
};

export function alcanceReportes(rol: string | null | undefined): AlcanceReportes {
  const ventas = rolTienePermiso(rol, { reporte: ["ventas"] });
  return {
    ventas,
    soloPropias: !ventas && rolTienePermiso(rol, { reporte: ["ventasPropias"] }),
    utilidad: rolTienePermiso(rol, { reporte: ["utilidad"] }),
    compras: rolTienePermiso(rol, { reporte: ["compras"] }),
    inventario: rolTienePermiso(rol, { reporte: ["inventario"] }) && rolTienePermiso(rol, { producto: ["verCosto"] }),
    cuentasPorCobrar: rolTienePermiso(rol, { venta: ["cobrar"] }),
  };
}

/** Pestañas de /reportes visibles para el rol, en orden. */
export function pestanasReportes(a: AlcanceReportes) {
  return [
    ...(a.ventas || a.soloPropias ? [{ href: "/reportes/ventas", titulo: a.soloPropias ? "Mis ventas" : "Ventas" }] : []),
    ...(a.ventas ? [{ href: "/reportes/productos", titulo: "Más vendidos" }] : []),
    ...(a.compras ? [{ href: "/reportes/compras", titulo: "Compras" }] : []),
    ...(a.inventario ? [{ href: "/reportes/inventario", titulo: "Inventario" }] : []),
  ];
}
