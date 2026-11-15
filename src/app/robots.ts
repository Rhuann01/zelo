import type { MetadataRoute } from "next";
import { getSiteUrl } from "@/lib/seo/site-url";

export default function robots(): MetadataRoute.Robots {
  const baseUrl = getSiteUrl();

  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/explorar", "/termos", "/privacidade"],
        disallow: [
          "/painel",
          "/painel/",
          "/super-admin",
          "/super-admin/",
          "/entrar",
          "/api/",
          "/meus-agendamentos",
          "/favoritos",
          "/perfil",
          "/auth/",
        ],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
    host: baseUrl,
  };
}
