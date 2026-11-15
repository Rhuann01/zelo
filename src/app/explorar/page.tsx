import type { Metadata } from "next";
import { ExplorarVitrine } from "@/components/explorar-vitrine";
import { getVitrinePaginada } from "@/lib/public/get-loja-publica";

export const revalidate = 300;

export const metadata: Metadata = {
  title: "Vitrine Regional — Zelo",
  description:
    "Descubra barbearias, salões e estúdios próximos a você e agende seu horário em segundos.",
  alternates: {
    canonical: "/explorar",
  },
  openGraph: {
    title: "Vitrine Regional — Zelo",
    description:
      "Descubra barbearias, salões e estúdios próximos a você e agende seu horário em segundos.",
    url: "/explorar",
    type: "website",
    locale: "pt_BR",
    images: [
      {
        url: "/og-zelo.png",
        width: 1200,
        height: 630,
        alt: "Vitrine Regional — Zelo",
      },
    ],
  },
};

export default async function ExplorarPage() {
  const { items, nextCursor, hasMore } = await getVitrinePaginada({ limit: 24 });

  return (
    <div className="flex min-h-screen flex-col bg-[var(--zelo-bg)] text-[var(--zelo-ink)]">
      <ExplorarVitrine
        lojas={items}
        initialNextCursor={nextCursor}
        initialHasMore={hasMore}
      />
    </div>
  );
}
