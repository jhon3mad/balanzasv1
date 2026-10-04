// Tipos compartidos entre Server Actions y componentes cliente.

export type FieldErrors = Partial<Record<string, string[]>>;

export type ActionResult<T = undefined> =
  | { ok: true; message: string; data: T }
  | { ok: false; message: string; fieldErrors?: FieldErrors };
