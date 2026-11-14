"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, MapPin, Search, X } from "lucide-react";
import { StoreMapPicker } from "@/components/ui/store-map";

interface NominatimItem {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
  address?: {
    road?: string;
    pedestrian?: string;
    house_number?: string;
    suburb?: string;
    neighbourhood?: string;
    quarter?: string;
    city_district?: string;
    city?: string;
    town?: string;
    municipality?: string;
    village?: string;
    state?: string;
    postcode?: string;
  };
}

interface StoreLocationFieldsProps {
  cidade: string;
  bairro: string;
  endereco: string;
  latitude: number | null;
  longitude: number | null;
  onChangeCidade: (val: string) => void;
  onChangeBairro: (val: string) => void;
  onChangeEndereco: (val: string) => void;
  onChangeCoords: (lat: number | null, lng: number | null) => void;
  disabled?: boolean;
  /** "card" para fundo de card (Onboarding), "soft" para Painel */
  variant?: "card" | "soft";
}

function formatCep(raw: string): string {
  const digits = raw.replace(/\D/g, "").slice(0, 8);
  if (digits.length <= 5) return digits;
  return `${digits.slice(0, 5)}-${digits.slice(5)}`;
}

function round6(n: number): number {
  return Math.round(n * 1_000_000) / 1_000_000;
}

export function StoreLocationFields({
  cidade,
  bairro,
  endereco,
  latitude,
  longitude,
  onChangeCidade,
  onChangeBairro,
  onChangeEndereco,
  onChangeCoords,
  disabled = false,
  variant = "card",
}: StoreLocationFieldsProps) {
  const [cep, setCep] = useState("");
  const [cepLoading, setCepLoading] = useState(false);
  const [cepStatus, setCepStatus] = useState<string | null>(null);
  const lastFetchedCepRef = useRef<string>("");

  const [searchQuery, setSearchQuery] = useState("");
  const [searchLoading, setSearchLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<NominatimItem[]>([]);
  const [searchError, setSearchError] = useState<string | null>(null);
  const searchAbortRef = useRef<AbortController | null>(null);

  const inputSurfaceClass =
    variant === "card"
      ? "bg-[var(--zelo-card)] shadow-xs"
      : "bg-[var(--zelo-soft)]";

  // Busca automática ao completar 8 dígitos do CEP (ViaCEP + posiciona pino no mapa)
  useEffect(() => {
    const digits = cep.replace(/\D/g, "");
    if (digits.length !== 8) {
      if (digits.length < 8) setCepStatus(null);
      return;
    }
    if (lastFetchedCepRef.current === digits) return;
    lastFetchedCepRef.current = digits;

    const controller = new AbortController();
    setCepLoading(true);
    setCepStatus(null);

    (async () => {
      try {
        const res = await fetch(`https://viacep.com.br/ws/${digits}/json/`, {
          signal: controller.signal,
        });
        if (!res.ok) throw new Error("Falha ao consultar CEP");
        const data = (await res.json()) as {
          erro?: boolean;
          localidade?: string;
          uf?: string;
          bairro?: string;
          logradouro?: string;
          complemento?: string;
        };

        if (data.erro) {
          setCepStatus("CEP não encontrado. Confira os números ou busque pelo nome.");
          setCepLoading(false);
          return;
        }

        const nextCidade = data.localidade?.trim() ?? "";
        const nextBairro = data.bairro?.trim() ?? "";
        const nextLogradouro = data.logradouro?.trim() ?? "";

        if (nextCidade) onChangeCidade(nextCidade);
        if (nextBairro) onChangeBairro(nextBairro);
        if (nextLogradouro) onChangeEndereco(nextLogradouro);

        setCepStatus(
          nextCidade
            ? `CEP encontrado: ${[nextLogradouro, nextBairro, nextCidade].filter(Boolean).join(", ")}`
            : "CEP localizado."
        );

        // Posiciona automaticamente o pino no mapa com base no endereço do CEP
        const geoQuery = [nextLogradouro, nextBairro, nextCidade, data.uf, "Brasil"]
          .filter(Boolean)
          .join(", ");
        if (geoQuery.length >= 4) {
          try {
            const geoRes = await fetch(
              `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(
                geoQuery
              )}`,
              { signal: controller.signal }
            );
            if (geoRes.ok) {
              const geoData = (await geoRes.json()) as Array<{ lat: string; lon: string }>;
              if (geoData[0]) {
                onChangeCoords(round6(Number(geoData[0].lat)), round6(Number(geoData[0].lon)));
              }
            }
          } catch {
            // Se falhar geocoding automático, usuário ainda pode ajustar no mapa
          }
        }
      } catch (err) {
        if ((err as Error).name !== "AbortError") {
          setCepStatus("Não foi possível consultar o CEP agora.");
        }
      } finally {
        setCepLoading(false);
      }
    })();

    return () => controller.abort();
  }, [cep, onChangeBairro, onChangeCidade, onChangeCoords, onChangeEndereco]);

  // Pesquisa com sugestões por nome/rua/referência (Nominatim)
  useEffect(() => {
    const q = searchQuery.trim();
    if (q.length < 3) {
      setSuggestions([]);
      setSearchError(null);
      return;
    }

    const timer = window.setTimeout(async () => {
      searchAbortRef.current?.abort();
      const controller = new AbortController();
      searchAbortRef.current = controller;
      setSearchLoading(true);
      setSearchError(null);

      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&countrycodes=br&limit=5&q=${encodeURIComponent(
            q
          )}`,
          { signal: controller.signal }
        );
        if (!res.ok) throw new Error("Erro na busca");
        const data = (await res.json()) as NominatimItem[];
        setSuggestions(data);
        if (data.length === 0) {
          setSearchError("Nenhum local encontrado. Tente incluir a cidade junto (ex: Rua X, Belo Horizonte).");
        }
      } catch (err) {
        if ((err as Error).name !== "AbortError") {
          setSearchError("Não foi possível pesquisar agora.");
        }
      } finally {
        setSearchLoading(false);
      }
    }, 450);

    return () => {
      window.clearTimeout(timer);
    };
  }, [searchQuery]);

  function handleSelectSuggestion(item: NominatimItem) {
    const addr = item.address ?? {};
    const nextCidade =
      addr.city ?? addr.town ?? addr.municipality ?? addr.village ?? "";
    const nextBairro =
      addr.suburb ?? addr.neighbourhood ?? addr.quarter ?? addr.city_district ?? "";
    const road = addr.road ?? addr.pedestrian ?? "";
    const nextEnd = [road, addr.house_number].filter(Boolean).join(", ");

    if (nextCidade) onChangeCidade(nextCidade);
    if (nextBairro) onChangeBairro(nextBairro);
    if (nextEnd) {
      onChangeEndereco(nextEnd);
    } else if (!endereco.trim()) {
      onChangeEndereco(item.display_name.split(",")[0]?.trim() ?? "");
    }

    const lat = round6(Number(item.lat));
    const lng = round6(Number(item.lon));
    if (Number.isFinite(lat) && Number.isFinite(lng)) {
      onChangeCoords(lat, lng);
    }

    if (addr.postcode) {
      lastFetchedCepRef.current = addr.postcode.replace(/\D/g, "");
      setCep(formatCep(addr.postcode));
    }

    setSuggestions([]);
    setSearchQuery("");
    setSearchError(null);
  }

  return (
    <div className="space-y-3">
      {/* CEP + Pesquisa por nome/endereço */}
      <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
        <div className="sm:col-span-5">
          <label className="block text-[11px] font-semibold uppercase tracking-wider text-[var(--zelo-muted)] mb-1.5">
            CEP (preenche automático)
          </label>
          <div className={`flex items-center gap-2 rounded-xl px-3 h-11 ${inputSurfaceClass}`}>
            <input
              type="text"
              inputMode="numeric"
              disabled={disabled}
              value={cep}
              onChange={(e) => setCep(formatCep(e.target.value))}
              placeholder="00000-000"
              maxLength={9}
              className="w-full bg-transparent text-sm font-mono-num outline-none"
            />
            {cepLoading && <Loader2 className="h-4 w-4 animate-spin text-[var(--zelo-muted)] shrink-0" />}
          </div>
        </div>

        <div className="sm:col-span-7 relative">
          <label className="block text-[11px] font-semibold uppercase tracking-wider text-[var(--zelo-muted)] mb-1.5">
            Buscar pelo nome ou rua
          </label>
          <div className={`flex items-center gap-2 rounded-xl px-3 h-11 ${inputSurfaceClass}`}>
            <Search className="h-4 w-4 text-[var(--zelo-subtle)] shrink-0" />
            <input
              type="text"
              disabled={disabled}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Ex: Av. Paulista, Savassi, Centro..."
              className="w-full bg-transparent text-sm outline-none"
            />
            {searchLoading && <Loader2 className="h-4 w-4 animate-spin text-[var(--zelo-muted)] shrink-0" />}
            {searchQuery && !searchLoading && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery("");
                  setSuggestions([]);
                  setSearchError(null);
                }}
                aria-label="Limpar pesquisa"
                className="text-[var(--zelo-subtle)] hover:text-[var(--zelo-ink)]"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {suggestions.length > 0 && (
            <div className="absolute left-0 right-0 top-[calc(100%+4px)] z-30 rounded-xl bg-[var(--zelo-card)] p-1.5 shadow-lg ring-1 ring-[var(--zelo-border)] max-h-60 overflow-y-auto space-y-1">
              {suggestions.map((item) => (
                <button
                  key={item.place_id}
                  type="button"
                  onClick={() => handleSelectSuggestion(item)}
                  className="w-full rounded-lg px-3 py-2 text-left text-xs hover:bg-[var(--zelo-soft)] transition flex items-start gap-2"
                >
                  <MapPin className="h-3.5 w-3.5 mt-0.5 text-emerald-500 shrink-0" />
                  <span className="line-clamp-2 text-[var(--zelo-ink)]">{item.display_name}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {cepStatus && (
        <p className="text-[11px] text-[var(--zelo-muted)]">{cepStatus}</p>
      )}
      {searchError && (
        <p className="text-[11px] text-amber-600 dark:text-amber-400">{searchError}</p>
      )}

      {/* Cidade e Bairro */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        <div>
          <label className="block text-[11px] font-semibold uppercase tracking-wider text-[var(--zelo-muted)] mb-1.5">
            Cidade
          </label>
          <div className={`flex items-center gap-2 rounded-xl px-3 h-11 ${inputSurfaceClass}`}>
            <MapPin className="h-4 w-4 text-[var(--zelo-subtle)] shrink-0" />
            <input
              type="text"
              disabled={disabled}
              value={cidade}
              onChange={(e) => onChangeCidade(e.target.value)}
              placeholder="Ex: Belo Horizonte"
              className="w-full bg-transparent text-sm outline-none"
            />
          </div>
        </div>

        <div>
          <label className="block text-[11px] font-semibold uppercase tracking-wider text-[var(--zelo-muted)] mb-1.5">
            Bairro
          </label>
          <input
            type="text"
            disabled={disabled}
            value={bairro}
            onChange={(e) => onChangeBairro(e.target.value)}
            placeholder="Ex: Savassi"
            className={`h-11 w-full rounded-xl px-3.5 text-sm outline-none ${inputSurfaceClass}`}
          />
        </div>
      </div>

      {/* Endereço completo */}
      <div>
        <label className="block text-[11px] font-semibold uppercase tracking-wider text-[var(--zelo-muted)] mb-1.5">
          Endereço (rua, número e complemento)
        </label>
        <input
          type="text"
          disabled={disabled}
          value={endereco}
          onChange={(e) => onChangeEndereco(e.target.value)}
          placeholder="Ex: Rua Pernambuco, 420 - Sala 2"
          className={`h-11 w-full rounded-xl px-3.5 text-sm outline-none ${inputSurfaceClass}`}
        />
      </div>

      {/* Mapa Interativo */}
      {!disabled && (
        <div className="pt-1">
          <StoreMapPicker
            enderecoTexto={endereco}
            bairro={bairro}
            cidade={cidade}
            latitude={latitude}
            longitude={longitude}
            onChangeCoords={onChangeCoords}
          />
        </div>
      )}
    </div>
  );
}
