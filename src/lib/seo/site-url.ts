export const SUPPORT_EMAIL = "suportezelo84@gmail.com";

export function getSiteUrl(): string {
  const raw = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (!raw) return "https://zelo.app";
  return raw.replace(/\/+$/, "");
}
