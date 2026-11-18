import { getLojaPublicaBySlug } from "@/lib/public/get-loja-publica";

export const revalidate = 3600;

export async function GET(
  _request: Request,
  context: { params: Promise<{ slug: string }> }
) {
  const { slug } = await context.params;
  const data = await getLojaPublicaBySlug(slug);

  if (!data) {
    return new Response(
      JSON.stringify({
        error: "Espaço não encontrado",
      }),
      {
        status: 404,
        headers: {
          "Content-Type": "application/manifest+json; charset=utf-8",
        },
      }
    );
  }

  const { loja } = data;
  const icons: Array<{
    src: string;
    sizes: string;
    type?: string;
    purpose?: string;
  }> = [];

  if (loja.logo_url) {
    icons.push({
      src: loja.logo_url,
      sizes: "192x192",
      purpose: "any",
    });
  }

  icons.push(
    {
      src: "/icon-192.png",
      sizes: "192x192",
      type: "image/png",
      purpose: "any",
    },
    {
      src: "/icon-512.png",
      sizes: "512x512",
      type: "image/png",
      purpose: "any",
    }
  );

  const manifest = {
    id: `/${loja.slug}`,
    name: loja.nome,
    short_name: loja.nome.slice(0, 12),
    description: loja.descricao_publica || `Agende online na ${loja.nome}`,
    start_url: `/${loja.slug}`,
    scope: "/",
    display: "standalone",
    background_color:
      loja.modo_escuro || loja.tema === "urban" ? "#0F0F12" : "#FAF9F6",
    theme_color: loja.cor_primaria || "#FAF9F6",
    icons,
  };

  return new Response(JSON.stringify(manifest), {
    status: 200,
    headers: {
      "Content-Type": "application/manifest+json; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
