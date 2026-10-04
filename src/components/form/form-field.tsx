import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field";

type Props = {
  label: string;
  htmlFor?: string;
  error?: { message?: string };
  description?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
};

/** Campo de formulario con etiqueta, descripción y mensaje de error. */
export function FormField({ label, htmlFor, error, description, className, children }: Props) {
  return (
    <Field data-invalid={!!error} className={className}>
      <FieldLabel htmlFor={htmlFor}>{label}</FieldLabel>
      {children}
      {description && <FieldDescription>{description}</FieldDescription>}
      <FieldError errors={[error]} />
    </Field>
  );
}
