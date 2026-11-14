import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export interface StockPhotoItem {
  id: number;
  alt: string;
  photographer: string;
  thumbUrl: string;
  fullUrl: string;
}

interface PexelsPhoto {
  id: number;
  alt?: string;
  photographer?: string;
  src: {
    medium: string;
    large: string;
    landscape: string;
  };
}

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ ok: false, error: "Não autorizado." }, { status: 401 });
  }

  const rawQuery = req.nextUrl.searchParams.get("q") ?? "";
  const query = rawQuery.trim().slice(0, 60) || "barbearia";
  const tipo = req.nextUrl.searchParams.get("tipo") === "servico" ? "servico" : "banner";

  const apiKey = process.env.PEXELS_API_KEY?.trim();
  if (!apiKey) {
    return NextResponse.json({
      ok: false,
      missingKey: true,
      photos: [] as StockPhotoItem[],
      message: "Configure PEXELS_API_KEY no servidor (.env.local) para buscar fotos grátis.",
    });
  }

  try {
    const orientation = tipo === "banner" ? "landscape" : "square";
    const endpoint = `https://api.pexels.com/v1/search?query=${encodeURIComponent(
      query
    )}&locale=pt-BR&orientation=${orientation}&per_page=12`;

    const res = await fetch(endpoint, {
      headers: { Authorization: apiKey },
      next: { revalidate: 3600 },
    });

    if (!res.ok) {
      return NextResponse.json(
        { ok: false, photos: [] as StockPhotoItem[], message: "Falha ao consultar banco de fotos." },
        { status: 502 }
      );
    }

    const data = (await res.json()) as { photos?: PexelsPhoto[] };
    const photos: StockPhotoItem[] = (data.photos ?? []).map((p) => ({
      id: p.id,
      alt: p.alt || query,
      photographer: p.photographer || "Pexels",
      thumbUrl: p.src.medium,
      fullUrl: tipo === "banner" ? p.src.landscape : p.src.large,
    }));

    return NextResponse.json({ ok: true, photos });
  } catch {
    return NextResponse.json(
      { ok: false, photos: [] as StockPhotoItem[], message: "Erro de rede ao buscar fotos." },
      { status: 500 }
    );
  }
}
