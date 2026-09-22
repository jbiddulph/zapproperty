/**
 * Server-side forward geocoding via the Mapbox Geocoding API v6.
 *
 * ZapTask's Asset API returns postal addresses but not coordinates, so each
 * property address is resolved here. Results are memoised per address for the
 * life of the process and in-flight lookups are de-duplicated, so a page of
 * properties never triggers the same request twice.
 */

export type LngLat = [number, number];

export interface GeocodeResult {
  coordinates: LngLat;
  placeName: string | null;
  featureType: string | null;
  confidence: string | null;
}

interface MapboxFeature {
  geometry?: { coordinates?: number[] };
  properties?: {
    full_address?: string;
    feature_type?: string;
    match_code?: { confidence?: string };
  };
}

const cache = new Map<string, GeocodeResult | null>();
const inFlight = new Map<string, Promise<GeocodeResult | null>>();

const MAX_CONCURRENCY = 6;
let active = 0;
const queue: Array<() => void> = [];

function acquire(): Promise<void> {
  if (active < MAX_CONCURRENCY) {
    active += 1;
    return Promise.resolve();
  }
  return new Promise((resolve) => {
    queue.push(() => {
      active += 1;
      resolve();
    });
  });
}

function release(): void {
  active -= 1;
  const next = queue.shift();
  if (next) next();
}

export function normaliseAddress(parts: Array<string | null | undefined>): string {
  return parts
    .map((p) => p?.trim())
    .filter((p): p is string => Boolean(p))
    .join(", ");
}

export async function geocodeAddress(
  address: string,
  options: { token: string; country?: string | null },
): Promise<GeocodeResult | null> {
  const key = `${options.country ?? ""}|${address.toLowerCase()}`;

  if (cache.has(key)) return cache.get(key) ?? null;
  const pending = inFlight.get(key);
  if (pending) return pending;

  const task = (async () => {
    await acquire();
    try {
      const url = new URL("https://api.mapbox.com/search/geocode/v6/forward");
      url.searchParams.set("q", address);
      url.searchParams.set("limit", "1");
      url.searchParams.set("autocomplete", "false");
      url.searchParams.set("access_token", options.token);
      if (options.country) url.searchParams.set("country", options.country);

      const response = await fetch(url, { cache: "no-store" });
      if (!response.ok) {
        // Don't poison the cache on transient failures (rate limits, 5xx).
        if (response.status >= 500 || response.status === 429) return null;
        cache.set(key, null);
        return null;
      }

      const json = (await response.json()) as { features?: MapboxFeature[] };
      const feature = json.features?.[0];
      const coords = feature?.geometry?.coordinates;

      if (!coords || coords.length < 2) {
        cache.set(key, null);
        return null;
      }

      const result: GeocodeResult = {
        coordinates: [coords[0], coords[1]],
        placeName: feature?.properties?.full_address ?? null,
        featureType: feature?.properties?.feature_type ?? null,
        confidence: feature?.properties?.match_code?.confidence ?? null,
      };
      cache.set(key, result);
      return result;
    } catch {
      return null;
    } finally {
      release();
      inFlight.delete(key);
    }
  })();

  inFlight.set(key, task);
  return task;
}

export function geocodeCacheSize(): number {
  return cache.size;
}
