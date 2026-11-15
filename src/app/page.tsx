import { LandingPage } from "@/components/landing-page";
import { getSiteUrl } from "@/lib/seo/site-url";

export default function HomePage() {
  const siteUrl = getSiteUrl();
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "Zelo",
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web, Android, iOS",
    url: siteUrl,
    inLanguage: "pt-BR",
    description:
      "Plataforma de agendamento online, vitrine regional e sinal via PIX para barbearias, salões de beleza, manicures e estúdios.",
    offers: [
      {
        "@type": "Offer",
        name: "Plano Solo",
        price: "29.00",
        priceCurrency: "BRL",
        description: "1 profissional, agenda online e vitrine exclusiva. 14 dias grátis.",
      },
      {
        "@type": "Offer",
        name: "Plano Estúdio",
        price: "59.00",
        priceCurrency: "BRL",
        description: "Equipe completa, comissões e notificações Web Push. 14 dias grátis.",
      },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c"),
        }}
      />
      <LandingPage />
    </>
  );
}
