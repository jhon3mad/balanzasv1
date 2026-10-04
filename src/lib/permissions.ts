import { createAccessControl } from "better-auth/plugins/access";
import { defaultStatements } from "better-auth/plugins/admin/access";

/**
 * Catálogo de permisos del sistema: recurso → acciones.
 * Se comparte entre servidor y cliente (para ocultar menús y botones),
 * pero la verificación que cuenta siempre es la del servidor.
 */
export const statements = {
  // Permisos que usa el plugin admin de better-auth (gestión de usuarios y sesiones)
  ...defaultStatements,
  configuracion: ["editar"],
  catalogo: ["gestionar"],
  producto: ["ver", "verCosto", "crear", "editar", "eliminar"],
  inventario: ["ver", "verKardex", "ajustar"],
  proveedor: ["ver", "gestionar"],
  compra: ["ver", "crear", "recibir", "pagar", "anular"],
  cliente: ["ver", "gestionar"],
  venta: ["ver", "crear", "cobrar", "entregar", "anular", "precioBajoMinimo"],
  ordenServicio: ["ver", "crear", "actualizar", "anular"],
  reporte: ["ventas", "ventasPropias", "compras", "inventario", "utilidad"],
} as const;

export const ac = createAccessControl(statements);

export const admin = ac.newRole({
  user: ["create", "list", "set-role", "ban", "delete", "set-password", "set-email", "get", "update"],
  session: ["list", "revoke", "delete"],
  configuracion: ["editar"],
  catalogo: ["gestionar"],
  producto: ["ver", "verCosto", "crear", "editar", "eliminar"],
  inventario: ["ver", "verKardex", "ajustar"],
  proveedor: ["ver", "gestionar"],
  compra: ["ver", "crear", "recibir", "pagar", "anular"],
  cliente: ["ver", "gestionar"],
  venta: ["ver", "crear", "cobrar", "entregar", "anular", "precioBajoMinimo"],
  ordenServicio: ["ver", "crear", "actualizar", "anular"],
  reporte: ["ventas", "ventasPropias", "compras", "inventario", "utilidad"],
});

export const vendedor = ac.newRole({
  producto: ["ver"],
  inventario: ["ver"],
  cliente: ["ver", "gestionar"],
  venta: ["ver", "crear", "cobrar", "entregar"],
  ordenServicio: ["ver", "crear", "actualizar"],
  reporte: ["ventasPropias"],
});

export const almacenero = ac.newRole({
  producto: ["ver", "verCosto"],
  inventario: ["ver", "verKardex", "ajustar"],
  proveedor: ["ver", "gestionar"],
  compra: ["ver", "crear", "recibir"],
  reporte: ["compras", "inventario"],
});

export const roles = { admin, vendedor, almacenero } as const;

export type Rol = keyof typeof roles;

export const ROLES = ["admin", "vendedor", "almacenero"] as const satisfies readonly Rol[];

export const ROL_LABELS: Record<Rol, string> = {
  admin: "Administrador",
  vendedor: "Vendedor",
  almacenero: "Almacenero",
};

export type Permisos = {
  [R in keyof typeof statements]?: ReadonlyArray<(typeof statements)[R][number]>;
};

export function isRol(value: unknown): value is Rol {
  return typeof value === "string" && value in roles;
}

/** Verifica (sin consultar la BD) si un rol tiene todos los permisos pedidos. */
export function rolTienePermiso(rol: string | null | undefined, permisos: Permisos): boolean {
  if (!isRol(rol)) return false;
  return roles[rol].authorize(permisos).success;
}
