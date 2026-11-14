"use client";

import { useEffect, useRef, useState } from "react";
import { Crosshair, ExternalLink, Link2, Loader2, MapPin, Search } from "lucide-react";

/**
 * Extrai latitude e longitude de URLs do Google Maps ou texto "lat, lng".
 */
export function parseGoogleMapsCoords(
  input: string
): { lat: number; lng: number } | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  // 1. Padrão !3dLAT!4dLNG (links de place do Google Maps)
  const bangMatch = trimmed.match(/!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/);
  if (bangMatch) {
    const lat = Number(bangMatch[1]);
    const lng = Number(bangMatch[2]);
    if (isValidLatLng(lat, lng)) return { lat: round6(lat), lng: round6(lng) };
  }

  // 2. Padrão @LAT,LNG ou q=LAT,LNG ou ll=LAT,LNG ou raw "LAT, LNG"
  const coordMatch = trimmed.match(
    /(?:@|[?&](?:q|ll)=|^)\s*(-?\d{1,2}\.\d+)\s*,\s*(-?\d{1,3}\.\d+)/
  );
  if (coordMatch) {
    const lat = Number(coordMatch[1]);
    const lng = Number(coordMatch[2]);
    if (isValidLatLng(lat, lng)) return { lat: round6(lat), lng: round6(lng) };
  }

  return null;
}

function isValidLatLng(lat: number, lng: number) {
  return (
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    lat >= -90 &&
    lat <= 90 &&
    lng >= -180 &&
    lng <= 180
  );
}

function round6(n: number) {
  return Number(n.toFixed(6));
}

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
    return `https://maps.google.com/maps?q=${latitude},${longitude}&z=17&output=embed`;
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
 * Mapa real embutido leve para a página pública `/[slug]` (zero JS de mapa pesado).
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

/**
 * Mapa interativo Leaflet carregado sob demanda apenas no painel do lojista.
 * Permite clicar em qualquer ponto ou arrastar o pino para ajustar a posição exata.
 */
function InteractiveLeafletPicker({
  latitude,
  longitude,
  cidade,
  bairro,
  onChangeCoords,
}: {
  latitude: number | null;
  longitude: number | null;
  cidade: string;
  bairro: string;
  onChangeCoords: (lat: number, lng: number) => void;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<import("leaflet").Map | null>(null);
  const markerRef = useRef<import("leaflet").Marker | null>(null);
  const tileLayerRef = useRef<import("leaflet").TileLayer | null>(null);
  const [satellite, setSatellite] = useState(false);
  const onChangeRef = useRef(onChangeCoords);
  onChangeRef.current = onChangeCoords;

  useEffect(() => {
    let active = true;
    let resizeObs: ResizeObserver | null = null;
    const hasCoords = latitude != null && longitude != null;
    const defaultLat = latitude ?? -14.235;
    const defaultLng = longitude ?? -51.9253;

    (async () => {
      // @ts-expect-error Leaflet CSS loaded dynamically only inside picker
      await import("leaflet/dist/leaflet.css");
      const L = (await import("leaflet")).default;
      if (!active || !containerRef.current || mapRef.current) return;

      const map = L.map(containerRef.current, {
        center: [defaultLat, defaultLng],
        zoom: hasCoords ? 17 : 4,
        zoomControl: true,
      });

      const layer = L.tileLayer(
        "https://mt{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}",
        {
          subdomains: ["0", "1", "2", "3"],
          attribution: "&copy; Google Maps",
          maxZoom: 20,
        }
      ).addTo(map);
      tileLayerRef.current = layer;

      const pinIcon = L.divIcon({
        className: "",
        html: `<div style="width:30px;height:30px;border-radius:9999px;background:#111111;border:3px solid #FFFFFF;box-shadow:0 4px 12px rgba(0,0,0,0.45);display:flex;align-items:center;justify-content:center;"><div style="width:9px;height:9px;border-radius:9999px;background:#EF4444;"></div></div>`,
        iconSize: [30, 30],
        iconAnchor: [15, 15],
      });

      const placeMarker = (lat: number, lng: number) => {
        if (!markerRef.current) {
          const m = L.marker([lat, lng], { draggable: true, icon: pinIcon }).addTo(map);
          m.on("dragend", () => {
            const pos = m.getLatLng();
            onChangeRef.current(round6(pos.lat), round6(pos.lng));
          });
          markerRef.current = m;
        } else {
          markerRef.current.setLatLng([lat, lng]);
        }
      };

      if (hasCoords && latitude != null && longitude != null) {
        placeMarker(latitude, longitude);
      } else if (cidade.trim().length >= 2) {
        // Centraliza na cidade da loja quando ainda não há pino salvo
        const q = [bairro, cidade, "Brasil"].filter(Boolean).join(", ");
        fetch(
          `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(
            q
          )}`
        )
          .then((r) => r.json())
          .then((arr: Array<{ lat: string; lon: string }>) => {
            if (!active || !arr[0] || markerRef.current) return;
            map.setView([Number(arr[0].lat), Number(arr[0].lon)], 13, { animate: false });
          })
          .catch(() => null);
      }

      map.on("click", (e: import("leaflet").LeafletMouseEvent) => {
        const lat = round6(e.latlng.lat);
        const lng = round6(e.latlng.lng);
        placeMarker(lat, lng);
        onChangeRef.current(lat, lng);
      });

      mapRef.current = map;
      setTimeout(() => map.invalidateSize(), 120);

      if (typeof ResizeObserver !== "undefined" && containerRef.current) {
        resizeObs = new ResizeObserver(() => {
          map.invalidateSize();
        });
        resizeObs.observe(containerRef.current);
      }
    })();

    return () => {
      active = false;
      resizeObs?.disconnect();
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
        markerRef.current = null;
        tileLayerRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!tileLayerRef.current) return;
    const lyrs = satellite ? "y" : "m";
    tileLayerRef.current.setUrl(`https://mt{s}.google.com/vt/lyrs=${lyrs}&x={x}&y={y}&z={z}`);
  }, [satellite]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (latitude == null || longitude == null) {
      if (markerRef.current) {
        markerRef.current.remove();
        markerRef.current = null;
      }
      return;
    }

    (async () => {
      const L = (await import("leaflet")).default;
      if (!markerRef.current) {
        const pinIcon = L.divIcon({
          className: "",
          html: `<div style="width:28px;height:28px;border-radius:9999px;background:#111111;border:3px solid #FFFFFF;box-shadow:0 4px 12px rgba(0,0,0,0.45);display:flex;align-items:center;justify-content:center;"><div style="width:8px;height:8px;border-radius:9999px;background:#F59E0B;"></div></div>`,
          iconSize: [28, 28],
          iconAnchor: [14, 14],
        });
        const m = L.marker([latitude, longitude], {
          draggable: true,
          icon: pinIcon,
        }).addTo(map);
        m.on("dragend", () => {
          const pos = m.getLatLng();
          onChangeRef.current(round6(pos.lat), round6(pos.lng));
        });
        markerRef.current = m;
      } else {
        markerRef.current.setLatLng([latitude, longitude]);
      }
      map.invalidateSize();
      map.setView([latitude, longitude], 17, { animate: false });
    })();
  }, [latitude, longitude]);

  return (
    <div className="relative overflow-hidden rounded-xl bg-[var(--zelo-soft)]">
      <div ref={containerRef} className="h-60 w-full z-0" />
      <span className="pointer-events-none absolute top-2 left-2 z-[400] rounded-lg bg-black/75 px-2.5 py-1 text-[11px] font-medium text-white backdrop-blur-xs">
        Toque no mapa ou arraste o pino para ajustar
      </span>
      <button
        type="button"
        onClick={() => setSatellite((s) => !s)}
        className="absolute top-2 right-2 z-[400] rounded-lg bg-white/95 px-2.5 py-1 text-[11px] font-semibold text-[#111111] shadow-sm transition-colors hover:bg-white"
      >
        {satellite ? "Mapa" : "Satélite"}
      </button>
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
 * Seletor de localização exata: GPS, busca por endereço, link do Google Maps e pino arrastável no mapa.
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
  const [mapsLinkInput, setMapsLinkInput] = useState("");
  const [feedback, setFeedback] = useState<string | null>(null);

  const fetchApproximateIpLocation = async (): Promise<{ lat: number; lng: number; city?: string } | null> => {
    try {
      const res = await fetch("https://ipwho.is/", { signal: AbortSignal.timeout(5000) });
      if (res.ok) {
        const data = (await res.json()) as {
          success?: boolean;
          latitude?: number;
          longitude?: number;
          city?: string;
        };
        if (
          data.success !== false &&
          typeof data.latitude === "number" &&
          typeof data.longitude === "number" &&
          isValidLatLng(data.latitude, data.longitude)
        ) {
          return {
            lat: round6(data.latitude),
            lng: round6(data.longitude),
            city: data.city,
          };
        }
      }
    } catch {
      // Tenta fallback secundário
    }

    try {
      const res = await fetch("https://ipapi.co/json/", { signal: AbortSignal.timeout(5000) });
      if (res.ok) {
        const data = (await res.json()) as {
          latitude?: number;
          longitude?: number;
          city?: string;
        };
        if (
          typeof data.latitude === "number" &&
          typeof data.longitude === "number" &&
          isValidLatLng(data.latitude, data.longitude)
        ) {
          return {
            lat: round6(data.latitude),
            lng: round6(data.longitude),
            city: data.city,
          };
        }
      }
    } catch {
      // Sem fallback disponível
    }
    return null;
  };

  const handleUseGps = () => {
    setLoadingGps(true);
    setFeedback(null);

    const applyIpFallback = async (blockedByPermission: boolean) => {
      const approx = await fetchApproximateIpLocation();
      setLoadingGps(false);
      if (approx) {
        onChangeCoords(approx.lat, approx.lng);
        setFeedback(
          approx.city
            ? `Localização aproximada em ${approx.city}. Arraste o pino ou toque no mapa para marcar o ponto exato.`
            : "Localização aproximada pela internet. Arraste o pino ou toque no mapa para ajustar."
        );
        return;
      }
      setFeedback(
        blockedByPermission
          ? "Permissão de localização bloqueada no navegador. Libere ou toque direto no mapa."
          : "GPS indisponível neste dispositivo/navegador. Use 'Buscar endereço no mapa', cole o link do Google Maps ou toque direto no mapa."
      );
    };

    if (typeof window !== "undefined" && !window.isSecureContext) {
      setFeedback("GPS automático exige HTTPS ou localhost. Toque direto no mapa ou cole o link do Google Maps.");
      setLoadingGps(false);
      return;
    }

    if (!navigator.geolocation) {
      void applyIpFallback(false);
      return;
    }

    const onSuccess = (pos: GeolocationPosition) => {
      onChangeCoords(round6(pos.coords.latitude), round6(pos.coords.longitude));
      setLoadingGps(false);
      setFeedback("Localização GPS marcada! Arraste o pino se quiser ajustar.");
    };

    const onFinalError = (err: GeolocationPositionError) => {
      void applyIpFallback(err.code === 1);
    };

    navigator.geolocation.getCurrentPosition(
      onSuccess,
      (err) => {
        if (err.code === 1) {
          onFinalError(err);
          return;
        }
        // Fallback sem highAccuracy (aproveita cache do navegador quando GPS puro dá timeout)
        navigator.geolocation.getCurrentPosition(onSuccess, onFinalError, {
          enableHighAccuracy: false,
          timeout: 10_000,
          maximumAge: 300_000,
        });
      },
      { enableHighAccuracy: true, timeout: 15_000, maximumAge: 0 }
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
        onChangeCoords(round6(Number(data[0].lat)), round6(Number(data[0].lon)));
        setFeedback("Endereço aproximado encontrado. Arraste o pino se quiser ajustar.");
      } else {
        setFeedback("Endereço não localizado. Toque no mapa ou cole o link do Google Maps.");
      }
    } catch {
      setFeedback("Não foi possível consultar o mapa agora.");
    } finally {
      setLoadingGeo(false);
    }
  };

  const handleApplyMapsLink = () => {
    const coords = parseGoogleMapsCoords(mapsLinkInput);
    if (!coords) {
      setFeedback("Não encontrei coordenadas nesse link. Cole a URL completa do Google Maps.");
      return;
    }
    onChangeCoords(coords.lat, coords.lng);
    setMapsLinkInput("");
    setFeedback("Coordenadas extraídas do Google Maps!");
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

      {/* Colar link do Google Maps */}
      <div className="flex gap-2">
        <div className="flex min-w-0 flex-1 items-center gap-2 rounded-lg bg-[var(--zelo-soft)] px-3 h-11">
          <Link2 className="h-4 w-4 shrink-0 text-[var(--zelo-subtle)]" />
          <input
            type="text"
            value={mapsLinkInput}
            onChange={(e) => setMapsLinkInput(e.target.value)}
            placeholder="Ou cole o link do Google Maps..."
            className="min-w-0 w-full bg-transparent text-xs outline-none"
          />
        </div>
        <button
          type="button"
          onClick={handleApplyMapsLink}
          disabled={!mapsLinkInput.trim()}
          className="min-h-[44px] rounded-lg bg-[var(--zelo-soft)] px-3 text-xs font-semibold text-[var(--zelo-ink)] disabled:opacity-50"
        >
          Aplicar
        </button>
      </div>

      {feedback && (
        <p className="text-[11px] text-[var(--zelo-muted)]">{feedback}</p>
      )}

      <InteractiveLeafletPicker
        latitude={latitude}
        longitude={longitude}
        cidade={cidade}
        bairro={bairro}
        onChangeCoords={(lat, lng) => onChangeCoords(lat, lng)}
      />

      {latitude != null && longitude != null && (
        <div className="flex items-center justify-between text-[11px] font-mono-num text-[var(--zelo-muted)]">
          <span>
            Pin exato: {latitude}, {longitude}
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
