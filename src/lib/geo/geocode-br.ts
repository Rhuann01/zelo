export interface GeoSuggestion {
  id: string;
  label: string;
  lat: number;
  lng: number;
  cidade?: string;
  bairro?: string;
  endereco?: string;
  cep?: string;
  uf?: string;
}

interface PhotonFeature {
  properties?: {
    osm_id?: number;
    name?: string;
    street?: string;
    housenumber?: string;
    district?: string;
    locality?: string;
    city?: string;
    town?: string;
    state?: string;
    countrycode?: string;
    postcode?: string;
  };
  geometry?: {
    coordinates?: [number, number];
  };
}

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

export function round6(n: number): number {
  return Math.round(n * 1_000_000) / 1_000_000;
}

/**
 * Pesquisa endereços/lugares no Brasil com tolerância a erros de digitação (Photon/OSM + fallback Nominatim).
 */
export async function searchBrazilAddress(
  query: string,
  options?: { limit?: number; signal?: AbortSignal; cidadeHint?: string }
): Promise<GeoSuggestion[]> {
  const limit = options?.limit ?? 5;
  const q = query.trim();
  if (q.length < 2) return [];

  const fullQuery =
    options?.cidadeHint &&
    options.cidadeHint.trim().length >= 2 &&
    !q.toLowerCase().includes(options.cidadeHint.trim().toLowerCase())
      ? `${q}, ${options.cidadeHint.trim()}`
      : q;

  // 1. Photon (fuzzy / tolerante a erros de digitação, ex: "anicetro" -> "Aniceto")
  try {
    const res = await fetch(
      `https://photon.komoot.io/api/?q=${encodeURIComponent(fullQuery)}&limit=${limit + 3}&lang=pt`,
      { signal: options?.signal }
    );
    if (res.ok) {
      const json = (await res.json()) as { features?: PhotonFeature[] };
      const features = (json.features ?? []).filter((f) => {
        const cc = f.properties?.countrycode?.toUpperCase();
        return !cc || cc === "BR";
      });

      if (features.length > 0) {
        return features.slice(0, limit).map((f, idx) => {
          const p = f.properties ?? {};
          const [lon, lat] = f.geometry?.coordinates ?? [0, 0];
          const street = p.street ?? p.name ?? "";
          const endereco = [street, p.housenumber].filter(Boolean).join(", ");
          const bairro = p.district ?? p.locality ?? "";
          const cidade = p.city ?? p.town ?? "";
          const labelParts = [
            endereco || p.name,
            bairro && bairro !== endereco ? bairro : "",
            cidade,
            p.state,
            p.postcode,
          ].filter(Boolean);

          return {
            id: `ph-${p.osm_id ?? idx}-${lat}-${lon}`,
            label: labelParts.join(" — ") || q,
            lat: round6(lat),
            lng: round6(lon),
            cidade: cidade || undefined,
            bairro: bairro || undefined,
            endereco: endereco || undefined,
            cep: p.postcode || undefined,
          };
        });
      }
    }
  } catch (err) {
    if ((err as Error).name === "AbortError") throw err;
  }

  // 2. Fallback Nominatim
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&countrycodes=br&limit=${limit}&q=${encodeURIComponent(
        fullQuery
      )}`,
      { signal: options?.signal }
    );
    if (res.ok) {
      const data = (await res.json()) as NominatimItem[];
      return data.map((item) => {
        const addr = item.address ?? {};
        const cidade =
          addr.city ?? addr.town ?? addr.municipality ?? addr.village ?? undefined;
        const bairro =
          addr.suburb ?? addr.neighbourhood ?? addr.quarter ?? addr.city_district ?? undefined;
        const road = addr.road ?? addr.pedestrian ?? "";
        const endereco = [road, addr.house_number].filter(Boolean).join(", ") || undefined;

        return {
          id: `nom-${item.place_id}`,
          label: item.display_name,
          lat: round6(Number(item.lat)),
          lng: round6(Number(item.lon)),
          cidade,
          bairro,
          endereco,
          cep: addr.postcode,
        };
      });
    }
  } catch (err) {
    if ((err as Error).name === "AbortError") throw err;
  }

  return [];
}

/**
 * Geocodificação em cascata: tenta rua+bairro+cidade, depois rua+cidade, depois bairro+cidade, depois cidade.
 */
export async function geocodeBrazilCascade(params: {
  endereco?: string;
  bairro?: string;
  cidade?: string;
  uf?: string;
  signal?: AbortSignal;
}): Promise<{ lat: number; lng: number; precision: "street" | "neighborhood" | "city" } | null> {
  const end = params.endereco?.trim() ?? "";
  const bai = params.bairro?.trim() ?? "";
  const cid = params.cidade?.trim() ?? "";
  const uf = params.uf?.trim() ?? "";

  const attempts: Array<{ q: string; precision: "street" | "neighborhood" | "city" }> = [];
  if (end && cid) {
    if (bai) attempts.push({ q: [end, bai, cid, uf, "Brasil"].filter(Boolean).join(", "), precision: "street" });
    attempts.push({ q: [end, cid, uf, "Brasil"].filter(Boolean).join(", "), precision: "street" });
  } else if (end) {
    attempts.push({ q: [end, "Brasil"].join(", "), precision: "street" });
  }
  if (bai && cid) {
    attempts.push({ q: [bai, cid, uf, "Brasil"].filter(Boolean).join(", "), precision: "neighborhood" });
  }
  if (cid) {
    attempts.push({ q: [cid, uf, "Brasil"].filter(Boolean).join(", "), precision: "city" });
  }

  for (const attempt of attempts) {
    const results = await searchBrazilAddress(attempt.q, {
      limit: 1,
      signal: params.signal,
    });
    if (results[0] && Number.isFinite(results[0].lat) && Number.isFinite(results[0].lng)) {
      return {
        lat: results[0].lat,
        lng: results[0].lng,
        precision: attempt.precision,
      };
    }
  }

  return null;
}
