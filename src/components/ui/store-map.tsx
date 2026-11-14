"use client";

import { useState } from "react";
import { Crosshair, ExternalLink, Loader2, MapPin, Search } from "lucide-react";

export function buildExternalMapUrl(params: {
  latitude?: number | null;
  longitude?: number | null;
  mapsUrl?: string | null;
  addressQuery?: string;
}): string | null {
  if (params.latitude != null && params.longitude != null) {
    return `https://www.google.com/maps/search/?api=1&query=${params.latitude},${params.longitude}`;
  }
  if (params.mapsUrl) return params.mapsUrl;
  if (params.addressQuery && params.addressQuery.trim().length > 0) {
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
      params.addressQuery
    )}`;
  }
  return null;
}

export function buildEmbedMapUrl(params: {
  latitude?: number | null;
  longitude?: number | null;
  addressQuery?: string;
}): string | null {
  const { latitude, longitude, addressQuery } = params;
  if (latitude != null && longitude != null) {
    const dLon = 0.0055;
    const dLat = 0.004;
    const bbox = [
      (longitude - dLon).toFixed(6),
      (latitude - dLat).toFixed(6),
      (longitude + dLon).toFixed(6),
      (latitude + dLat).toFixed(6),
    ].join("%2C");
    return `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${latitude}%2C${longitude}`;
  }
  if (addressQuery && addressQuery.trim().length > 0) {
    return `https://maps.google.com/maps?q=${encodeURIComponent(
      addressQuery
    )}&z=15&output=embed`;
  }
  return null;
}

interface StoreMapEmbedProps {
  latitude?: number | null;
  longitude?: number | null;
  addressQuery?: string;
  mapsUrl?: string | null;
  title?: string;
}

/**
 * Mapa real embutido (OpenStreetMap/Google) com ação direta para abrir na localização exata.
 */
export function StoreMapEmbed({
  latitude,
  longitude,
  addressQuery,
  mapsUrl,
  title = "Localização do estabelecimento",
}: StoreMapEmbedProps) {
  const embedUrl = buildEmbedMapUrl({ latitude, longitude, addressQuery });
  const externalUrl = buildExternalMapUrl({
    latitude,
    longitude,
    mapsUrl,
    addressQuery,
  });

  if (!embedUrl) return null;

  return (
    <div className="relative overflow-hidden rounded-xl bg-[var(--zelo-soft)]">
      <iframe
        title={title}
        src={embedUrl}
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
        className="h-44 w-full border-0"
      />
      {externalUrl && (
        <a
          href={externalUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="absolute bottom-2.5 right-2.5 inline-flex min-h-[38px] items-center gap-1.5 rounded-xl bg-[var(--zelo-btn-bg)] px-3 text-xs font-semibold text-[var(--zelo-btn-ink)] shadow-lg transition-transform active:scale-95"
        >
          <MapPin className="h-3.5 w-3.5" />
          <span>Abrir no mapa</span>
          <ExternalLink className="h-3 w-3 opacity-80" />
        </a>
      )}
    </div>
  );
}

interface StoreMapPickerProps {
  enderecoTexto: string;
  bairro: string;
  cidade: string;
  latitude: number | null;
  longitude: number | null;
  onChangeCoords: (lat: number | null, lng: number | null) => void;
}

/**
 * Seletor de localização real via GPS do navegador ou busca de endereço (Nominatim OSM, R$ 0).
 */
export function StoreMapPicker({
  enderecoTexto,
  bairro,
  cidade,
  latitude,
  longitude,
  onChangeCoords,
}: StoreMapPickerProps) {
  const [loadingGps, setLoadingGps] = useState(false);
  const [loadingGeo, setLoadingGeo] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const addressQuery = [enderecoTexto, bairro, cidade, "Brasil"]
    .filter(Boolean)
    .join(", ");

  const handleUseGps = () => {
    if (!navigator.geolocation) {
      setFeedback("Seu navegador não suporta geolocalização.");
      return;
    }
    setLoadingGps(true);
    setFeedback(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        onChangeCoords(
          Number(pos.coords.latitude.toFixed(6)),
          Number(pos.coords.longitude.toFixed(6))
        );
        setLoadingGps(false);
        setFeedback("Localização atual marcada no mapa.");
      },
      () => {
        setLoadingGps(false);
        setFeedback("Permita o acesso à localização ou busque pelo endereço.");
      },
      { enableHighAccuracy: true, timeout: 10_000 }
    );
  };

  const handleGeocodeAddress = async () => {
    const q = [enderecoTexto, bairro, cidade].filter(Boolean).join(", ");
    if (q.trim().length < 3) {
      setFeedback("Preencha cidade, bairro ou endereço antes de buscar.");
      return;
    }
    setLoadingGeo(true);
    setFeedback(null);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(
          `${q}, Brasil`
        )}`
      );
      const data = (await res.json()) as Array<{ lat: string; lon: string }>;
      if (data[0]) {
        onChangeCoords(
          Number(Number(data[0].lat).toFixed(6)),
          Number(Number(data[0].lon).toFixed(6))
        );
        setFeedback("Endereço encontrado e marcado no mapa.");
      } else {
        setFeedback("Endereço não localizado. Tente usar o botão de GPS.");
      }
    } catch {
      setFeedback("Não foi possível consultar o mapa agora.");
    } finally {
      setLoadingGeo(false);
    }
  };

  return (
    <div className="space-y-2.5">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <button
          type="button"
          onClick={handleUseGps}
          disabled={loadingGps}
          className="inline-flex min-h-[44px] items-center justify-center gap-1.5 rounded-xl bg-[var(--zelo-btn-bg)] px-3 text-xs font-semibold text-[var(--zelo-btn-ink)] disabled:opacity-60"
        >
          {loadingGps ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Crosshair className="h-4 w-4" />
          )}
          <span>Usar minha localização (GPS)</span>
        </button>
        <button
          type="button"
          onClick={handleGeocodeAddress}
          disabled={loadingGeo}
          className="inline-flex min-h-[44px] items-center justify-center gap-1.5 rounded-xl bg-[var(--zelo-soft)] px-3 text-xs font-semibold text-[var(--zelo-ink)] disabled:opacity-60"
        >
          {loadingGeo ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Search className="h-4 w-4" />
          )}
          <span>Buscar endereço no mapa</span>
        </button>
      </div>

      {feedback && (
        <p className="text-[11px] text-[var(--zelo-muted)]">{feedback}</p>
      )}

      <StoreMapEmbed
        latitude={latitude}
        longitude={longitude}
        addressQuery={addressQuery}
        title="Prévia da localização da loja"
      />

      {latitude != null && longitude != null && (
        <div className="flex items-center justify-between text-[11px] font-mono-num text-[var(--zelo-muted)]">
          <span>
            Pin: {latitude}, {longitude}
          </span>
          <button
            type="button"
            onClick={() => onChangeCoords(null, null)}
            className="text-rose-500 hover:underline"
          >
            Limpar pin
          </button>
        </div>
      )}
    </div>
  );
}
