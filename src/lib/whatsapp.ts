// Envío por WhatsApp con el enlace "click to chat" (wa.me): gratis, sin API.
// Abre WhatsApp con el mensaje escrito; el usuario solo presiona Enviar.

/**
 * Normaliza un celular a formato internacional sin "+":
 * "987 654 321" → "51987654321"; "+51 987654321" → "51987654321".
 * Otros países: se acepta si ya viene con código (10 a 15 dígitos). Inválido → null.
 */
export function normalizarCelular(texto: string): string | null {
  const digitos = texto.replace(/\D/g, "");
  if (/^9\d{8}$/.test(digitos)) return `51${digitos}`;
  if (/^519\d{8}$/.test(digitos)) return digitos;
  if (texto.trim().startsWith("+") && /^\d{10,15}$/.test(digitos)) return digitos;
  return null;
}

/** Enlace wa.me. Sin número, WhatsApp pide elegir el contacto. */
export function enlaceWhatsapp(numero: string | null, mensaje: string): string {
  return `https://wa.me/${numero ?? ""}?text=${encodeURIComponent(mensaje)}`;
}
