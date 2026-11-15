import { z } from "zod";

export const LINK_PUBLICO_TIPOS = [
  "instagram",
  "whatsapp",
  "tiktok",
  "youtube",
  "facebook",
  "site",
  "outro",
] as const;

export type LinkPublicoTipo = (typeof LINK_PUBLICO_TIPOS)[number];

export interface LinkPublico {
  tipo: LinkPublicoTipo;
  label: string;
  url: string;
}

export const LINK_PUBLICO_DEFAULT_LABEL: Record<LinkPublicoTipo, string> = {
  instagram: "Instagram",
  whatsapp: "WhatsApp",
  tiktok: "TikTok",
  youtube: "YouTube",
  facebook: "Facebook",
  site: "Site",
  outro: "Link",
};

/**
 * Normaliza entrada do lojista (@arroba, telefone ou URL sem https) para URL segura http/https.
 * Retorna null se o protocolo for inválido/inseguro.
 */
export function normalizePublicLinkUrl(
  tipo: LinkPublicoTipo,
  rawInput: string
): string | null {
  const trimmed = rawInput.trim();
  if (!trimmed) return null;

  if (tipo === "whatsapp" && !/^https?:\/\//i.test(trimmed)) {
    const digits = trimmed.replace(/\D/g, "");
    if (digits.length >= 10 && digits.length <= 15) {
      const normalized = digits.startsWith("55") ? digits : `55${digits}`;
      return `https://wa.me/${normalized}`;
    }
  }

  if (trimmed.startsWith("@")) {
    const handle = trimmed.slice(1).replace(/[^a-zA-Z0-9._-]/g, "");
    if (!handle) return null;
    if (tipo === "instagram") return `https://instagram.com/${handle}`;
    if (tipo === "tiktok") return `https://tiktok.com/@${handle}`;
    if (tipo === "youtube") return `https://youtube.com/@${handle}`;
  }

  const withProtocol = /^https?:\/\//i.test(trimmed)
    ? trimmed
    : trimmed.includes(".") && !/^[a-zA-Z]+:/i.test(trimmed)
      ? `https://${trimmed}`
      : trimmed;

  try {
    const parsed = new URL(withProtocol);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return null;
    }
    return parsed.toString();
  } catch {
    return null;
  }
}

export const linkPublicoItemSchema = z.object({
  tipo: z.enum(LINK_PUBLICO_TIPOS),
  label: z.string().trim().max(30, "Rótulo de no máximo 30 caracteres.").default(""),
  url: z.string().trim().min(1, "Informe o link.").max(300, "Link muito longo."),
});

export const lojaDescricaoLinksSchema = z.object({
  descricao_publica: z
    .string()
    .trim()
    .max(400, "A descrição deve ter no máximo 400 caracteres."),
  links_publicos: z
    .array(linkPublicoItemSchema)
    .max(6, "Você pode adicionar no máximo 6 links."),
});
