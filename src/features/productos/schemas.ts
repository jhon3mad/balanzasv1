import {
  decimalTexto,
  decimalTextoOpcional,
  enteroTexto,
  enteroTextoOpcional,
  textoOpcional,
  textoRequerido,
  z,
} from "@/lib/validation";
import { CAMPOS_POR_TIPO, FUNCIONAMIENTOS, TIPOS_ENCHUFE, TIPOS_PRODUCTO } from "./constants";

/** Id de catálogo elegido en un select: "" → null */
const idSelect = z
  .string()
  .regex(/^\d*$/, "Opción inválida")
  .transform((v) => (v === "" ? null : Number(v)));

const enumOpcional = <T extends readonly [string, ...string[]]>(valores: T) =>
  z.union([z.literal(""), z.enum(valores)]).transform((v) => (v === "" ? null : (v as T[number])));

export const presentacionSchema = z.object({
  /** Presentación ya registrada (en edición) */
  id: z.number().int().positive().optional(),
  nombre: textoRequerido("El nombre de la presentación", 40),
  codigo: z
    .string()
    .trim()
    .toUpperCase()
    .min(1, "El código es obligatorio")
    .max(30, "Máximo 30 caracteres")
    .regex(/^[A-Z0-9][A-Z0-9._/-]*$/, "Solo letras, números, guion, punto y barra"),
  codigoBarras: z
    .string()
    .trim()
    .max(40, "Máximo 40 caracteres")
    .regex(/^[A-Za-z0-9-]*$/, "Solo letras, números y guion")
    .transform((v) => (v === "" ? null : v)),
  precioVenta: decimalTexto("El precio de venta"),
  precioMinimo: decimalTexto("El precio mínimo"),
  stockMinimo: enteroTexto("El stock mínimo", { max: 100_000 }),
  unidadesPorCaja: enteroTextoOpcional("Unidades por caja", { min: 1, max: 10_000 }),
  activo: z.boolean(),
  /** Solo para presentaciones nuevas: carga el inventario inicial */
  stockInicial: enteroTextoOpcional("El stock inicial", { max: 100_000 }),
  costoInicial: decimalTextoOpcional("El costo unitario", { decimales: 4 }),
});

export const productoSchema = z
  .object({
    id: z.number().int().positive().optional(),
    tipo: z.enum(TIPOS_PRODUCTO, { error: "Selecciona el tipo de producto" }),
    nombre: textoRequerido("El nombre", 120),
    modelo: textoOpcional("El modelo", 60),
    marcaId: idSelect,
    descripcion: textoOpcional("La descripción", 500),
    observaciones: textoOpcional("Las observaciones", 500),
    usoId: idSelect,
    formaId: idSelect,
    funcionamiento: enumOpcional(FUNCIONAMIENTOS),
    capacidadKg: decimalTextoOpcional("La capacidad", { decimales: 3, max: 100_000 }),
    precisionG: decimalTextoOpcional("La precisión", { decimales: 3, max: 100_000 }),
    voltaje: decimalTextoOpcional("El voltaje", { decimales: 2, max: 999 }),
    tipoEnchufe: enumOpcional(TIPOS_ENCHUFE),
    presentaciones: z.array(presentacionSchema).min(1, "Agrega al menos una presentación").max(20),
  })
  .superRefine((d, ctx) => {
    const campos = CAMPOS_POR_TIPO[d.tipo];
    const requerir = (cond: boolean, path: string, message: string) => {
      if (cond) ctx.addIssue({ code: "custom", path: [path], message });
    };

    requerir(campos.marca === "requerida" && d.marcaId === null, "marcaId", "Selecciona la marca");
    if (campos.balanza) {
      requerir(d.usoId === null, "usoId", "Selecciona el tipo de uso");
      requerir(d.formaId === null, "formaId", "Selecciona la forma");
      requerir(d.funcionamiento === null, "funcionamiento", "Selecciona el funcionamiento");
    }
    requerir(campos.capacidad && d.capacidadKg === null, "capacidadKg", "Ingresa la capacidad");
    requerir(campos.voltaje && d.voltaje === null, "voltaje", "Ingresa el voltaje");
    requerir(campos.enchufe && d.tipoEnchufe === null, "tipoEnchufe", "Selecciona el tipo de entrada");

    if (!d.presentaciones.some((p) => p.activo)) {
      ctx.addIssue({ code: "custom", path: ["presentaciones"], message: "Debe haber al menos una presentación activa" });
    }

    const vistos = { codigo: new Set<string>(), codigoBarras: new Set<string>(), nombre: new Set<string>() };
    d.presentaciones.forEach((p, i) => {
      if (Number(p.precioMinimo) > Number(p.precioVenta)) {
        ctx.addIssue({
          code: "custom",
          path: ["presentaciones", i, "precioMinimo"],
          message: "No puede ser mayor al precio de venta",
        });
      }
      if (p.stockInicial && p.stockInicial > 0 && p.costoInicial === null) {
        ctx.addIssue({
          code: "custom",
          path: ["presentaciones", i, "costoInicial"],
          message: "Indica el costo unitario del stock inicial",
        });
      }
      const duplicado = (clave: keyof typeof vistos, valor: string | null, mensaje: string) => {
        if (!valor) return;
        const normal = valor.toUpperCase();
        if (vistos[clave].has(normal)) {
          ctx.addIssue({ code: "custom", path: ["presentaciones", i, clave], message: mensaje });
        }
        vistos[clave].add(normal);
      };
      duplicado("codigo", p.codigo, "Código repetido en otra presentación");
      duplicado("codigoBarras", p.codigoBarras, "Código de barras repetido");
      duplicado("nombre", p.nombre, "Nombre repetido en otra presentación");
    });
  })
  .transform((d) => {
    // Deja en null las características que no aplican al tipo
    const campos = CAMPOS_POR_TIPO[d.tipo];
    return {
      ...d,
      marcaId: campos.marca === "no" ? null : d.marcaId,
      usoId: campos.balanza ? d.usoId : null,
      formaId: campos.balanza ? d.formaId : null,
      funcionamiento: campos.balanza ? d.funcionamiento : null,
      precisionG: campos.balanza ? d.precisionG : null,
      capacidadKg: campos.capacidad ? d.capacidadKg : null,
      voltaje: campos.voltaje ? d.voltaje : null,
      tipoEnchufe: campos.enchufe ? d.tipoEnchufe : null,
    };
  });

export type ProductoInput = z.input<typeof productoSchema>;
export type ProductoOutput = z.output<typeof productoSchema>;
export type PresentacionInput = z.input<typeof presentacionSchema>;

export const cambiarEstadoProductoSchema = z.object({
  id: z.number().int().positive(),
  activo: z.boolean(),
});

export const eliminarProductoSchema = z.object({ id: z.number().int().positive() });
