import type { MetadataRoute } from "next";
import { getSiteUrl } from "@/lib/seo/site-url";
import { createPublicClient } from "@/lib/supabase/public";

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = getSiteUrl();
  const now = new Date();

  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: baseUrl,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: `${baseUrl}/explorar`,
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.9,
    },
    {
      url: `${baseUrl}/termos`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.3,
    },
    {
      url: `${baseUrl}/privacidade`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.3,
    },
  ];

  try {
    const supabase = createPublicClient();
    const { data } = await supabase
      .from("lojas")
      .select("slug, updated_at, created_at")
      .eq("pausada", false)
      .order("created_at", { ascending: false })
      .limit(500);

    if (!data || data.length === 0) {
      return staticRoutes;
    }

    const storeRoutes: MetadataRoute.Sitemap = data
      .filter((row) => typeof row.slug === "string" && row.slug.trim().length > 0)
      .map((row) => ({
        url: `${baseUrl}/${row.slug}`,
        lastModified: new Date(row.updated_at || row.created_at || now),
        changeFrequency: "daily",
        priority: 0.8,
      }));

    return [...staticRoutes, ...storeRoutes];
  } catch {
    return staticRoutes;
  }
}
