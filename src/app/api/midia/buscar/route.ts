import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export interface StockPhotoItem {
  id: string;
  alt: string;
  photographer: string;
  thumbUrl: string;
  fullUrl: string;
  provider: "unsplash" | "pixabay" | "pexels";
}

interface UnsplashPhoto {
  id: string;
  alt_description?: string | null;
  user?: { name?: string };
  urls: {
    small: string;
    regular: string;
  };
}

interface PixabayHit {
  id: number;
  tags?: string;
  user?: string;
  webformatURL: string;
  largeImageURL: string;
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

  const unsplashKey = process.env.UNSPLASH_ACCESS_KEY?.trim();
  const pixabayKey = process.env.PIXABAY_API_KEY?.trim();
  const pexelsKey = process.env.PEXELS_API_KEY?.trim();

  if (!unsplashKey && !pixabayKey && !pexelsKey) {
    return NextResponse.json({
      ok: false,
      missingKey: true,
      photos: [] as StockPhotoItem[],
      message:
        "Configure UNSPLASH_ACCESS_KEY (unsplash.com/developers) ou PIXABAY_API_KEY (pixabay.com/api/docs) no .env.local para buscar fotos grátis.",
    });
  }

  try {
    if (unsplashKey) {
      const orientation = tipo === "banner" ? "landscape" : "squarish";
      const endpoint = `https://api.unsplash.com/search/photos?query=${encodeURIComponent(
        query
      )}&lang=pt&orientation=${orientation}&per_page=12`;

      const res = await fetch(endpoint, {
        headers: { Authorization: `Client-ID ${unsplashKey}` },
        next: { revalidate: 3600 },
      });

      if (!res.ok) {
        return NextResponse.json(
          { ok: false, photos: [] as StockPhotoItem[], message: "Falha ao consultar Unsplash API." },
          { status: 502 }
        );
      }

      const data = (await res.json()) as { results?: UnsplashPhoto[] };
      const photos: StockPhotoItem[] = (data.results ?? []).map((p) => ({
        id: `unsplash-${p.id}`,
        alt: p.alt_description || query,
        photographer: p.user?.name || "Unsplash",
        thumbUrl: p.urls.small,
        fullUrl: p.urls.regular,
        provider: "unsplash",
      }));

      return NextResponse.json({ ok: true, provider: "Unsplash", photos });
    }

    if (pixabayKey) {
      const orientation = tipo === "banner" ? "horizontal" : "all";
      const endpoint = `https://pixabay.com/api/?key=${encodeURIComponent(
        pixabayKey
      )}&q=${encodeURIComponent(query)}&lang=pt&image_type=photo&orientation=${orientation}&safesearch=true&per_page=12`;

      const res = await fetch(endpoint, {
        next: { revalidate: 3600 },
      });

      if (!res.ok) {
        return NextResponse.json(
          { ok: false, photos: [] as StockPhotoItem[], message: "Falha ao consultar Pixabay API." },
          { status: 502 }
        );
      }

      const data = (await res.json()) as { hits?: PixabayHit[] };
      const photos: StockPhotoItem[] = (data.hits ?? []).map((p) => ({
        id: `pixabay-${p.id}`,
        alt: p.tags || query,
        photographer: p.user || "Pixabay",
        thumbUrl: p.webformatURL,
        fullUrl: p.largeImageURL || p.webformatURL,
        provider: "pixabay",
      }));

      return NextResponse.json({ ok: true, provider: "Pixabay", photos });
    }

    const orientation = tipo === "banner" ? "landscape" : "square";
    const endpoint = `https://api.pexels.com/v1/search?query=${encodeURIComponent(
      query
    )}&locale=pt-BR&orientation=${orientation}&per_page=12`;

    const res = await fetch(endpoint, {
      headers: { Authorization: pexelsKey! },
      next: { revalidate: 3600 },
    });

    if (!res.ok) {
      return NextResponse.json(
        { ok: false, photos: [] as StockPhotoItem[], message: "Falha ao consultar Pexels API." },
        { status: 502 }
      );
    }

    const data = (await res.json()) as { photos?: PexelsPhoto[] };
    const photos: StockPhotoItem[] = (data.photos ?? []).map((p) => ({
      id: `pexels-${p.id}`,
      alt: p.alt || query,
      photographer: p.photographer || "Pexels",
      thumbUrl: p.src.medium,
      fullUrl: tipo === "banner" ? p.src.landscape : p.src.large,
      provider: "pexels",
    }));

    return NextResponse.json({ ok: true, provider: "Pexels", photos });
  } catch {
    return NextResponse.json(
      { ok: false, photos: [] as StockPhotoItem[], message: "Erro de rede ao buscar fotos." },
      { status: 500 }
    );
  }
}
