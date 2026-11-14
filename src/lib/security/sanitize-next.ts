/**
 * Garante que o parâmetro `next` seja exclusivamente um caminho relativo interno,
 * bloqueando Open Redirect (`//evil.com`, `/\evil.com`, URLs absolutas ou caracteres de controle).
 */
export function sanitizeNextPath(
  raw: string | null | undefined,
  fallback = "/painel"
): string {
  if (!raw) return fallback;
  const trimmed = raw.trim();
  if (
    !trimmed.startsWith("/") ||
    trimmed.startsWith("//") ||
    trimmed.startsWith("/\\") ||
    /[\x00-\x1f\s]/.test(trimmed)
  ) {
    return fallback;
  }
  return trimmed;
}

/**
 * Neutraliza CSV Formula Injection (DDE / Excel / LibreOffice) em células exportadas.
 */
export function sanitizeCsvCell(value: string | number | boolean): string {
  const str = String(value);
  const safe = /^[=+\-@\t\r]/.test(str) ? `'${str}` : str;
  return `"${safe.replace(/"/g, '""')}"`;
}
