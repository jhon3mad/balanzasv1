/** Error de negocio: su mensaje se muestra tal cual al usuario. */
export class AppError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AppError";
  }
}
