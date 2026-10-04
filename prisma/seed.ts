import "dotenv/config";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const ADMIN_USERNAME = (process.env.SEED_ADMIN_USERNAME ?? "admin").toLowerCase();
const ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD ?? "admin12345";
const ADMIN_NAME = process.env.SEED_ADMIN_NAME ?? "Administrador";
const TIENDA_NOMBRE = process.env.SEED_TIENDA_NOMBRE ?? "Mi Tienda de Balanzas";

/** better-auth exige email; si el usuario no tiene, se genera uno interno. */
function emailInterno(username: string) {
  return `${username}@usuarios.local`;
}

async function seedConfiguracion() {
  await prisma.configuracion.upsert({
    where: { id: 1 },
    update: {},
    create: { id: 1, nombreComercial: TIENDA_NOMBRE },
  });
  console.log("✔ Configuración de la tienda");
}

async function seedSeries() {
  const series = [
    { tipo: "BOLETA", serie: "B001" },
    { tipo: "ORDEN_SERVICIO", serie: "OS01" },
    { tipo: "COMPRA", serie: "OC01" },
  ] as const;
  for (const s of series) {
    await prisma.serie.upsert({
      where: { tipo_serie: { tipo: s.tipo, serie: s.serie } },
      update: {},
      create: s,
    });
  }
  console.log("✔ Series de correlativos");
}

async function seedMetodosPago() {
  const metodos = [
    { nombre: "Efectivo", esEfectivo: true, requiereReferencia: false, orden: 1 },
    { nombre: "Yape", esEfectivo: false, requiereReferencia: false, orden: 2 },
    { nombre: "Plin", esEfectivo: false, requiereReferencia: false, orden: 3 },
    { nombre: "Transferencia", esEfectivo: false, requiereReferencia: true, orden: 4 },
    { nombre: "Tarjeta", esEfectivo: false, requiereReferencia: false, orden: 5 },
    { nombre: "Otro", esEfectivo: false, requiereReferencia: false, orden: 6 },
  ];
  for (const m of metodos) {
    await prisma.metodoPago.upsert({ where: { nombre: m.nombre }, update: {}, create: m });
  }
  console.log("✔ Métodos de pago");
}

async function seedCatalogos() {
  const usos = ["Comercial", "De precisión", "Industrial"];
  const formas = ["Plataforma", "Mostrador", "Colgante"];
  const marcas = ["Kambor", "Patric"];
  for (const nombre of usos) {
    await prisma.usoBalanza.upsert({ where: { nombre }, update: {}, create: { nombre } });
  }
  for (const nombre of formas) {
    await prisma.formaBalanza.upsert({ where: { nombre }, update: {}, create: { nombre } });
  }
  for (const nombre of marcas) {
    await prisma.marca.upsert({ where: { nombre }, update: {}, create: { nombre } });
  }

  const servicios = [
    { nombre: "Cambio de batería", precioReferencial: "15.00" },
    { nombre: "Cambio de sensor", precioReferencial: "60.00" },
    { nombre: "Reparación general", precioReferencial: "40.00" },
    { nombre: "Calibración", precioReferencial: "25.00" },
  ];
  for (const s of servicios) {
    await prisma.servicio.upsert({ where: { nombre: s.nombre }, update: {}, create: s });
  }
  console.log("✔ Catálogos (usos, formas, marcas, servicios)");
}

async function seedAdmin() {
  const existente = await prisma.user.findUnique({ where: { username: ADMIN_USERNAME } });
  if (existente) {
    console.log(`• El usuario "${ADMIN_USERNAME}" ya existe, se omite`);
    return;
  }

  // Sin headers = llamada interna del servidor; el plugin admin la permite sin sesión.
  await auth.api.createUser({
    body: {
      email: emailInterno(ADMIN_USERNAME),
      password: ADMIN_PASSWORD,
      name: ADMIN_NAME,
      role: "admin",
      data: {
        username: ADMIN_USERNAME,
        displayUsername: ADMIN_USERNAME,
        mustChangePassword: true,
      },
    },
  });
  console.log(`✔ Usuario administrador "${ADMIN_USERNAME}" creado (debe cambiar la clave al ingresar)`);
}

async function main() {
  await seedConfiguracion();
  await seedSeries();
  await seedMetodosPago();
  await seedCatalogos();
  await seedAdmin();
}

main()
  .catch((error: unknown) => {
    console.error("✖ Error en el seed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
