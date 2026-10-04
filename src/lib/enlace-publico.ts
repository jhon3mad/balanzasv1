import "server-only";
import { headers } from "next/headers";

/**
 * URL pública del sistema. Se toma de APP_URL (recomendado en producción)
 * o, si no está, del host de la petición actual.
 */
export async function urlBase(): Promise<string> {
  if (process.env.APP_URL) return process.env.APP_URL.replace(/\/+$/, "");
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

/** false si la URL solo funciona en esta computadora o en la red local (el cliente no podría abrirla). */
export function esAccesibleDesdeInternet(url: string): boolean {
  const host = new URL(url).hostname;
  return !(
    host === "localhost" ||
    host.endsWith(".local") ||
    /^127\./.test(host) ||
    /^10\./.test(host) ||
    /^192\.168\./.test(host) ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(host)
  );
}
