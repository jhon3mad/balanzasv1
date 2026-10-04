import { NextResponse, type NextRequest } from "next/server";
import { getSessionCookie } from "better-auth/cookies";

/** /b y /o: boleta y orden de servicio por enlace (WhatsApp), protegidas por un código aleatorio. */
const RUTAS_PUBLICAS = ["/login", "/b", "/o"];

/**
 * Redirección rápida según la cookie de sesión. Solo verifica que la cookie
 * exista; la validación real de la sesión y los permisos se hace en el servidor
 * (layouts, páginas y Server Actions).
 */
export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const tieneSesion = !!getSessionCookie(request);
  const esPublica = RUTAS_PUBLICAS.some((ruta) => pathname === ruta || pathname.startsWith(`${ruta}/`));

  if (!tieneSesion && !esPublica) {
    const url = new URL("/login", request.url);
    if (pathname !== "/") url.searchParams.set("redirect", `${pathname}${search}`);
    return NextResponse.redirect(url);
  }

  if (tieneSesion && pathname === "/login") {
    return NextResponse.redirect(new URL("/", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|svg|webp|ico)$).*)"],
};
