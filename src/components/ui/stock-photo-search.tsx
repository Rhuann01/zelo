"use client";

import { useEffect, useState } from "react";
import { Check, Loader2, Search } from "lucide-react";

interface StockPhotoItem {
  id: number;
  alt: string;
  photographer: string;
  thumbUrl: string;
  fullUrl: string;
}

const SUGESTOES_POR_NICHO: Record<string, string[]> = {
  barbearia: ["Barbearia", "Corte masculino", "Barba", "Navalha"],
  salao: ["Salão de beleza", "Corte feminino", "Escova cabelo", "Penteado"],
  manicure: ["Manicure", "Unhas", "Esmaltação", "Pedicure"],
  estetica: ["Limpeza de pele", "Estética facial", "Spa", "Massagem"],
  outro: ["Barbearia", "Salão de beleza", "Manicure", "Estética"],
};

export function StockPhotoSearch({
  tipo,
  nicho = "outro",
  selectedUrl,
  disabled = false,
  onSelect,
}: {
  tipo: "banner" | "servico";
  nicho?: string;
  selectedUrl?: string | null;
  disabled?: boolean;
  onSelect: (url: string) => void;
}) {
  const sugestoes = SUGESTOES_POR_NICHO[nicho] ?? SUGESTOES_POR_NICHO.outro;
  const [query, setQuery] = useState(sugestoes[0]);
  const [photos, setPhotos] = useState<StockPhotoItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  async function runSearch(term: string) {
    const clean = term.trim();
    if (clean.length < 2) return;
    setLoading(true);
    setNotice(null);
    try {
      const res = await fetch(
        `/api/midia/buscar?q=${encodeURIComponent(clean)}&tipo=${tipo}`
      );
      const data = (await res.json()) as {
        ok: boolean;
        missingKey?: boolean;
        photos?: StockPhotoItem[];
        message?: string;
      };
      setPhotos(data.photos ?? []);
      if (!data.ok) {
        setNotice(data.message ?? "Não foi possível carregar as fotos.");
      } else if ((data.photos ?? []).length === 0) {
        setNotice("Nenhuma foto encontrada. Tente outro termo.");
      }
    } catch {
      setNotice("Erro de conexão ao buscar fotos.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void runSearch(sugestoes[0]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tipo, nicho]);

  return (
    <div className="space-y-3">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void runSearch(query);
        }}
        className="flex items-center gap-2"
      >
        <div className="flex h-10 flex-1 items-center gap-2 rounded-xl bg-[var(--zelo-soft)] px-3">
          <Search className="h-4 w-4 shrink-0 text-[var(--zelo-muted)]" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Ex: corte degradê, barba, manicure..."
            className="w-full bg-transparent text-xs text-[var(--zelo-ink)] outline-none placeholder:text-[var(--zelo-muted)]"
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="h-10 shrink-0 rounded-xl bg-[var(--zelo-btn-bg)] px-3.5 text-xs font-semibold text-[var(--zelo-btn-ink)] transition-transform active:scale-95 disabled:opacity-60"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Buscar"}
        </button>
      </form>

      <div className="no-scrollbar flex items-center gap-1.5 overflow-x-auto pb-0.5">
        {sugestoes.map((tag) => (
          <button
            key={tag}
            type="button"
            onClick={() => {
              setQuery(tag);
              void runSearch(tag);
            }}
            className="shrink-0 rounded-full bg-[var(--zelo-soft)] px-3 py-1 text-[11px] font-medium text-[var(--zelo-ink)] transition-colors hover:bg-[var(--zelo-border)]"
          >
            {tag}
          </button>
        ))}
      </div>

      {notice && (
        <div className="rounded-xl bg-[var(--zelo-soft)] p-3 text-xs text-[var(--zelo-muted)]">
          {notice}
        </div>
      )}

      {loading && photos.length === 0 ? (
        <div className="flex h-36 items-center justify-center text-xs text-[var(--zelo-muted)]">
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Buscando fotos grátis...
        </div>
      ) : (
        <div
          className={`grid gap-2 ${
            tipo === "banner" ? "grid-cols-2" : "grid-cols-3"
          }`}
        >
          {photos.map((photo) => {
            const selected = selectedUrl === photo.fullUrl;
            return (
              <button
                key={photo.id}
                type="button"
                disabled={disabled}
                onClick={() => onSelect(photo.fullUrl)}
                className={`group relative overflow-hidden rounded-xl bg-[var(--zelo-soft)] text-left transition-all disabled:opacity-60 ${
                  selected ? "ring-2 ring-[#10B981]" : "hover:opacity-90"
                }`}
              >
                <div
                  className={`relative w-full overflow-hidden ${
                    tipo === "banner" ? "aspect-[16/10]" : "aspect-square"
                  }`}
                >
                  {/* eslint-disable-next-line @next/next/img-element */}
                  <img
                    src={photo.thumbUrl}
                    alt={photo.alt}
                    loading="lazy"
                    className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                  {selected && (
                    <span className="absolute right-1.5 top-1.5 inline-flex h-5 w-5 items-center justify-center rounded-full bg-[#10B981] text-white shadow">
                      <Check className="h-3 w-3" />
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      )}

      <p className="text-[10px] text-[var(--zelo-muted)]">
        Fotos gratuitas fornecidas via Pexels API.
      </p>
    </div>
  );
}
