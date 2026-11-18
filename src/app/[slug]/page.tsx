import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getLojaPublicaBySlug } from "@/lib/public/get-loja-publica";
import { LojaPublicaView } from "@/components/loja-publica-view";
import { getSiteUrl } from "@/lib/seo/site-url";

export const revalidate = 3600;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const data = await getLojaPublicaBySlug(slug);
  if (!data) {
    return { title: "Espaço não encontrado — Zelo" };
  }

  const local = [data.loja.bairro, data.loja.cidade].filter(Boolean).join(", ");
  const title = `${data.loja.nome} — Agendamento Online | Zelo`;
  const description = local
    ? `Agende seu horário em ${data.loja.nome} (${local}) sem espera.`
    : `Agende seu horário em ${data.loja.nome} online com confirmação imediata.`;
  const image = data.loja.capa_url || data.loja.logo_url || "/og-zelo.png";

  return {
    title,
    description,
    manifest: `/${data.loja.slug}/manifest.webmanifest`,
    appleWebApp: {
      capable: true,
      title: data.loja.nome,
      statusBarStyle: "default",
    },
    alternates: {
      canonical: `/${data.loja.slug}`,
    },
    openGraph: {
      title,
      description,
      url: `/${data.loja.slug}`,
      type: "website",
      locale: "pt_BR",
      images: [{ url: image, alt: data.loja.nome }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [image],
    },
  };
}

export default async function LojaPublicaPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const data = await getLojaPublicaBySlug(slug);

  if (!data) {
    notFound();
  }

  const siteUrl = getSiteUrl();
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "HealthAndBeautyBusiness",
    name: data.loja.nome,
    url: `${siteUrl}/${data.loja.slug}`,
    ...(data.loja.logo_url || data.loja.capa_url
      ? { image: data.loja.capa_url || data.loja.logo_url }
      : {}),
    ...(data.loja.whatsapp_loja ? { telephone: data.loja.whatsapp_loja } : {}),
    address: {
      "@type": "PostalAddress",
      ...(data.loja.endereco_texto ? { streetAddress: data.loja.endereco_texto } : {}),
      ...(data.loja.cidade ? { addressLocality: data.loja.cidade } : {}),
      addressCountry: "BR",
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c"),
        }}
      />
      <LojaPublicaView
        loja={data.loja}
        servicos={data.servicos}
        profissionais={data.profissionais}
      />
    </>
  );
}
