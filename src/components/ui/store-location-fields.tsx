"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, MapPin, Search, X } from "lucide-react";
import { StoreMapPicker } from "@/components/ui/store-map";
import {
  geocodeBrazilCascade,
  round6,
  searchBrazilAddress,
  type GeoSuggestion,
} from "@/lib/geo/geocode-br";

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

function splitEndereco(raw: string): { rua: string; numero: string; complemento: string } {
  const trimmed = raw.trim();
  if (!trimmed) return { rua: "", numero: "", complemento: "" };

  const dashIdx = trimmed.indexOf(" - ");
  const mainPart = dashIdx >= 0 ? trimmed.slice(0, dashIdx).trim() : trimmed;
  const complemento = dashIdx >= 0 ? trimmed.slice(dashIdx + 3).trim() : "";

  const commaIdx = mainPart.lastIndexOf(",");
  if (commaIdx >= 0) {
    const afterComma = mainPart.slice(commaIdx + 1).trim();
    if (/^(\d+[a-zA-Z]?|s\/n|sn)$/i.test(afterComma)) {
      return {
        rua: mainPart.slice(0, commaIdx).trim(),
        numero: afterComma,
        complemento,
      };
    }
  }

  return { rua: mainPart, numero: "", complemento };
}

function joinEndereco(rua: string, numero: string, complemento: string): string {
  const r = rua.trim();
  const n = numero.trim();
  const c = complemento.trim();
  const base = r && n ? `${r}, ${n}` : r || n;
  if (!base) return c;
  return c ? `${base} - ${c}` : base;
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

  const initialParts = splitEndereco(endereco);
  const [rua, setRua] = useState(initialParts.rua);
  const [numero, setNumero] = useState(initialParts.numero);
  const [complemento, setComplemento] = useState(initialParts.complemento);

  const [searchQuery, setSearchQuery] = useState("");
  const [searchLoading, setSearchLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<GeoSuggestion[]>([]);
  const [searchError, setSearchError] = useState<string | null>(null);
  const searchAbortRef = useRef<AbortController | null>(null);

  const inputSurfaceClass =
    variant === "card"
      ? "bg-[var(--zelo-card)] shadow-xs"
      : "bg-[var(--zelo-soft)]";

  // Busca automática ao completar 8 dígitos do CEP (ViaCEP + BrasilAPI v2 + cascata no mapa)
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
        const [viaRes, brRes] = await Promise.allSettled([
          fetch(`https://viacep.com.br/ws/${digits}/json/`, { signal: controller.signal }),
          fetch(`https://brasilapi.com.br/api/cep/v2/${digits}`, { signal: controller.signal }),
        ]);

        let nextCidade = "";
        let nextUf = "";
        let nextBairro = "";
        let nextLogradouro = "";
        let brCoords: { lat: number; lng: number } | null = null;

        if (viaRes.status === "fulfilled" && viaRes.value.ok) {
          const viaData = (await viaRes.value.json()) as {
            erro?: boolean;
            localidade?: string;
            uf?: string;
            bairro?: string;
            logradouro?: string;
          };
          if (!viaData.erro) {
            nextCidade = viaData.localidade?.trim() ?? "";
            nextUf = viaData.uf?.trim() ?? "";
            nextBairro = viaData.bairro?.trim() ?? "";
            nextLogradouro = viaData.logradouro?.trim() ?? "";
          }
        }

        if (brRes.status === "fulfilled" && brRes.value.ok) {
          const brData = (await brRes.value.json()) as {
            city?: string;
            state?: string;
            neighborhood?: string;
            street?: string;
            location?: {
              coordinates?: {
                latitude?: string | number;
                longitude?: string | number;
              };
            };
          };
          if (!nextCidade) nextCidade = brData.city?.trim() ?? "";
          if (!nextUf) nextUf = brData.state?.trim() ?? "";
          if (!nextBairro) nextBairro = brData.neighborhood?.trim() ?? "";
          if (!nextLogradouro) nextLogradouro = brData.street?.trim() ?? "";

          const rawLat = Number(brData.location?.coordinates?.latitude);
          const rawLng = Number(brData.location?.coordinates?.longitude);
          if (Number.isFinite(rawLat) && Number.isFinite(rawLng) && rawLat !== 0 && rawLng !== 0) {
            brCoords = { lat: round6(rawLat), lng: round6(rawLng) };
          }
        }

        if (!nextCidade && !nextLogradouro) {
          setCepStatus("CEP não encontrado. Confira os números ou busque pelo nome.");
          setCepLoading(false);
          return;
        }

        if (nextCidade) onChangeCidade(nextCidade);
        if (nextBairro) onChangeBairro(nextBairro);
        if (nextLogradouro) {
          setRua(nextLogradouro);
          onChangeEndereco(joinEndereco(nextLogradouro, numero, complemento));
        }

        // Posiciona o pino no mapa: primeiro Photon/cascata (rua -> bairro -> cidade), ou BrasilAPI
        const geoHit = await geocodeBrazilCascade({
          endereco: nextLogradouro,
          bairro: nextBairro,
          cidade: nextCidade,
          uf: nextUf,
          signal: controller.signal,
        });

        if (geoHit && geoHit.precision === "street") {
          onChangeCoords(geoHit.lat, geoHit.lng);
        } else if (brCoords) {
          onChangeCoords(brCoords.lat, brCoords.lng);
        } else if (geoHit) {
          onChangeCoords(geoHit.lat, geoHit.lng);
        }

        setCepStatus(
          `CEP encontrado: ${[nextLogradouro, nextBairro, nextCidade].filter(Boolean).join(", ")}`
        );
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

  // Pesquisa fuzzy por nome/rua/referência (Photon + fallback Nominatim)
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
        // Primeiro tenta com cidadeHint se cidade estiver preenchida; se vier vazio, tenta busca ampla
        let results = await searchBrazilAddress(q, {
          limit: 5,
          signal: controller.signal,
          cidadeHint: cidade,
        });
        if (results.length === 0 && cidade.trim().length >= 2) {
          results = await searchBrazilAddress(q, {
            limit: 5,
            signal: controller.signal,
          });
        }

        setSuggestions(results);
        if (results.length === 0) {
          setSearchError("Nenhum local encontrado. Tente incluir a cidade (ex: Rua X, Caxias).");
        }
      } catch (err) {
        if ((err as Error).name !== "AbortError") {
          setSearchError("Não foi possível pesquisar agora.");
        }
      } finally {
        setSearchLoading(false);
      }
    }, 380);

    return () => {
      window.clearTimeout(timer);
    };
  }, [searchQuery, cidade]);

  function handleSelectSuggestion(item: GeoSuggestion) {
    if (item.cidade) onChangeCidade(item.cidade);
    if (item.bairro) onChangeBairro(item.bairro);
    if (item.endereco) {
      const parts = splitEndereco(item.endereco);
      const nextRua = parts.rua || item.endereco;
      const nextNum = parts.numero || numero;
      setRua(nextRua);
      if (parts.numero) setNumero(parts.numero);
      onChangeEndereco(joinEndereco(nextRua, nextNum, complemento));
    }
    onChangeCoords(item.lat, item.lng);

    if (item.cep) {
      lastFetchedCepRef.current = item.cep.replace(/\D/g, "");
      setCep(formatCep(item.cep));
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
              placeholder="Ex: Travessa Aniceto Cruz, Av. Paulista..."
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
                  key={item.id}
                  type="button"
                  onClick={() => handleSelectSuggestion(item)}
                  className="w-full rounded-lg px-3 py-2 text-left text-xs hover:bg-[var(--zelo-soft)] transition flex items-start gap-2"
                >
                  <MapPin className="h-3.5 w-3.5 mt-0.5 text-emerald-500 shrink-0" />
                  <span className="line-clamp-2 text-[var(--zelo-ink)]">{item.label}</span>
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
              placeholder="Ex: Caxias"
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
            placeholder="Ex: Ponte"
            className={`h-11 w-full rounded-xl px-3.5 text-sm outline-none ${inputSurfaceClass}`}
          />
        </div>
      </div>

      {/* Rua, Número e Complemento */}
      <div className="grid grid-cols-12 gap-2.5">
        <div className="col-span-8">
          <label className="block text-[11px] font-semibold uppercase tracking-wider text-[var(--zelo-muted)] mb-1.5">
            Rua / Travessa / Av.
          </label>
          <input
            type="text"
            disabled={disabled}
            value={rua}
            onChange={(e) => {
              const nextRua = e.target.value;
              setRua(nextRua);
              onChangeEndereco(joinEndereco(nextRua, numero, complemento));
            }}
            placeholder="Ex: Travessa Aniceto Cruz"
            className={`h-11 w-full rounded-xl px-3.5 text-sm outline-none ${inputSurfaceClass}`}
          />
        </div>

        <div className="col-span-4">
          <label className="block text-[11px] font-semibold uppercase tracking-wider text-[var(--zelo-muted)] mb-1.5">
            Número
          </label>
          <input
            type="text"
            disabled={disabled}
            value={numero}
            onChange={(e) => {
              const nextNum = e.target.value;
              setNumero(nextNum);
              onChangeEndereco(joinEndereco(rua, nextNum, complemento));
            }}
            placeholder="Ex: 120"
            className={`h-11 w-full rounded-xl px-3 text-sm font-mono-num outline-none ${inputSurfaceClass}`}
          />
        </div>
      </div>

      <div>
        <label className="block text-[11px] font-semibold uppercase tracking-wider text-[var(--zelo-muted)] mb-1.5">
          Complemento / Ponto de referência (opcional)
        </label>
        <input
          type="text"
          disabled={disabled}
          value={complemento}
          onChange={(e) => {
            const nextComp = e.target.value;
            setComplemento(nextComp);
            onChangeEndereco(joinEndereco(rua, numero, nextComp));
          }}
          placeholder="Ex: Sala 2, em frente à praça"
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
