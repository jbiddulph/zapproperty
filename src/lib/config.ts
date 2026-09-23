/**
 * Server-side configuration. Only import from route handlers / server code:
 * it reads the ZapTask API key, which must never reach the browser.
 */

export interface ServerConfig {
  zaptask: {
    baseUrl: string;
    apiKey: string | null;
    assetType: string | null;
    maxAssets: number;
    writeBackGeocode: boolean;
    /** Show sites even when "Show on ZapProperty" is unticked in ZapTask. */
    includeUnlisted: boolean;
  };
  mapbox: {
    serverToken: string | null;
    geocodeCountry: string | null;
  };
  demo: boolean;
}

function bool(value: string | undefined, fallback = false): boolean {
  if (value === undefined || value === "") return fallback;
  return ["1", "true", "yes", "on"].includes(value.trim().toLowerCase());
}

function isPlaceholder(value: string | undefined): boolean {
  return !value || value.includes("replace_me");
}

let cached: ServerConfig | null = null;

export function getServerConfig(): ServerConfig {
  if (cached) return cached;

  const apiKey = isPlaceholder(process.env.ZAPTASK_API_KEY)
    ? null
    : process.env.ZAPTASK_API_KEY!.trim();

  const publicToken = isPlaceholder(process.env.NEXT_PUBLIC_MAPBOX_TOKEN)
    ? null
    : process.env.NEXT_PUBLIC_MAPBOX_TOKEN!.trim();
  const serverToken = isPlaceholder(process.env.MAPBOX_SERVER_TOKEN)
    ? publicToken
    : process.env.MAPBOX_SERVER_TOKEN!.trim();

  // Whether a site appears is decided by the agent's "Show on ZapProperty"
  // checkbox, not its asset type — a listing can be a property, building,
  // unit or site in ZapTask. ZAPTASK_ASSET_TYPE remains as an optional extra
  // restriction.
  const rawType = (process.env.ZAPTASK_ASSET_TYPE ?? "").trim();
  const assetType = rawType === "" || rawType.toLowerCase() === "all" ? null : rawType;

  const maxAssets = Number.parseInt(process.env.ZAPTASK_MAX_ASSETS ?? "1000", 10);

  // Demo mode is explicit, or implied when no API key is available so the
  // UI can be explored without a ZapTask account.
  const demo = bool(process.env.ZAPTASK_DEMO) || apiKey === null;

  cached = {
    zaptask: {
      baseUrl: (process.env.ZAPTASK_BASE_URL ?? "https://app.zaptask.co.uk").replace(/\/$/, ""),
      apiKey,
      assetType,
      maxAssets: Number.isFinite(maxAssets) && maxAssets > 0 ? maxAssets : 1000,
      writeBackGeocode: bool(process.env.ZAPTASK_WRITE_BACK_GEOCODE),
      includeUnlisted: bool(process.env.ZAPTASK_INCLUDE_UNLISTED),
    },
    mapbox: {
      serverToken,
      geocodeCountry: process.env.GEOCODE_COUNTRY?.trim() || null,
    },
    demo,
  };

  return cached;
}
