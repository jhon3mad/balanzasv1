/** Solo se permiten rutas internas para evitar redirecciones abiertas. */
export function destinoSeguro(redirect: string | undefined): string {
  if (redirect && redirect.startsWith("/") && !redirect.startsWith("//")) return redirect;
  return "/";
}
