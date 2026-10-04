import { createAuthClient } from "better-auth/react";
import { adminClient, inferAdditionalFields, usernameClient } from "better-auth/client/plugins";
import type { auth } from "@/lib/auth";
import { ac, roles } from "@/lib/permissions";

export const authClient = createAuthClient({
  plugins: [inferAdditionalFields<typeof auth>(), usernameClient(), adminClient({ ac, roles })],
});

export const { signIn, signOut, useSession, changePassword } = authClient;
