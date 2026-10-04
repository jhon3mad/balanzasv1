import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { nextCookies } from "better-auth/next-js";
import { admin, username } from "better-auth/plugins";
import { prisma } from "@/lib/prisma";
import { ac, roles } from "@/lib/permissions";

export const auth = betterAuth({
  appName: "Sistema de Ventas",
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),
  emailAndPassword: {
    enabled: true,
    // Solo el administrador crea usuarios (plugin admin → createUser)
    disableSignUp: true,
    minPasswordLength: 8,
    maxPasswordLength: 128,
  },
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 días
    updateAge: 60 * 60 * 24, // renueva la sesión una vez al día
  },
  user: {
    additionalFields: {
      mustChangePassword: {
        type: "boolean",
        required: false,
        defaultValue: true,
        input: false,
      },
    },
  },
  plugins: [
    username({
      minUsernameLength: 3,
      maxUsernameLength: 30,
    }),
    admin({
      ac,
      roles,
      defaultRole: "vendedor",
      adminRoles: ["admin"],
      bannedUserMessage: "Tu usuario está desactivado. Comunícate con el administrador.",
    }),
    // Debe ir al final: permite que las Server Actions escriban cookies
    nextCookies(),
  ],
});

export type Session = typeof auth.$Infer.Session;
