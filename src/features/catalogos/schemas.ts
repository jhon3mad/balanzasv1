import { decimalTexto, enteroTexto, textoOpcional, textoRequerido, z } from "@/lib/validation";

/** Catálogos con solo nombre */
export const CATALOGOS_SIMPLES = ["marca", "uso", "forma"] as const;
export type CatalogoSimple = (typeof CATALOGOS_SIMPLES)[number];

export const CATALOGO_SIMPLE_LABELS: Record<CatalogoSimple, { singular: string; plural: string; ejemplo: string }> = {
  marca: { singular: "marca", plural: "Marcas", ejemplo: "Kambor" },
  uso: { singular: "uso de balanza", plural: "Usos de balanza", ejemplo: "Comercial" },
  forma: { singular: "forma de balanza", plural: "Formas de balanza", ejemplo: "Mostrador" },
};

export const ENTIDADES_CATALOGO = [...CATALOGOS_SIMPLES, "servicio", "metodoPago"] as const;
export type EntidadCatalogo = (typeof ENTIDADES_CATALOGO)[number];

const idOpcional = z.number().int().positive().optional();

export const catalogoSimpleSchema = z.object({
  entidad: z.enum(CATALOGOS_SIMPLES),
  id: idOpcional,
  nombre: textoRequerido("El nombre", 60),
});
export type CatalogoSimpleInput = z.input<typeof catalogoSimpleSchema>;

export const servicioSchema = z.object({
  id: idOpcional,
  nombre: textoRequerido("El nombre", 80),
  descripcion: textoOpcional("La descripción", 250),
  precioReferencial: decimalTexto("El precio"),
});
export type ServicioInput = z.input<typeof servicioSchema>;
export type ServicioOutput = z.output<typeof servicioSchema>;

export const metodoPagoSchema = z.object({
  id: idOpcional,
  nombre: textoRequerido("El nombre", 40),
  esEfectivo: z.boolean(),
  requiereReferencia: z.boolean(),
  orden: enteroTexto("El orden", { max: 999 }),
});
export type MetodoPagoInput = z.input<typeof metodoPagoSchema>;
export type MetodoPagoOutput = z.output<typeof metodoPagoSchema>;

export const cambiarEstadoCatalogoSchema = z.object({
  entidad: z.enum(ENTIDADES_CATALOGO),
  id: z.number().int().positive(),
  activo: z.boolean(),
});

export const eliminarCatalogoSchema = z.object({
  entidad: z.enum(ENTIDADES_CATALOGO),
  id: z.number().int().positive(),
});
