import type { Metadata } from "next";
import { ExplorarVitrine } from "@/components/explorar-vitrine";
import { getVitrinePaginada } from "@/lib/public/get-loja-publica";

export const revalidate = 300;

export const metadata: Metadata = {
  title: "Vitrine Regional — Zelo",
  description:
    "Descubra barbearias, salões e estúdios próximos a você e agende seu horário em segundos.",
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
