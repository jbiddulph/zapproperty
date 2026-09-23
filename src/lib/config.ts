/**
 * Server-side configuration. Only import from route handlers / server code:
 * it reads the ZapTask API key, which must never reach the browser.
 */

/**
 * Which ZapTask API the key unlocks.
 *
 * - `platform`: the ZapProperty portal key (`zp_live_…`, ZAPPROPERTY_API_KEY on
 *   the ZapTask server). Reads every listing published with "Show on
 *   ZapProperty" across all companies via `/api/v1/zapproperty/*`.
 * - `company`: a company API key (`zt_live_…`). Sees one company's sites via
 *   `/api/v1/assets`; the published filter is applied here instead.
 */
export type ZapTaskScope = "platform" | "company";

export interface ServerConfig {
  zaptask: {
    baseUrl: string;
    apiKey: string | null;
    scope: ZapTaskScope;
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

/**
 * The key prefix says which API it belongs to; ZAPTASK_API_SCOPE overrides
 * for keys minted without the conventional prefix.
 */
function resolveScope(apiKey: string | null, override: string | undefined): ZapTaskScope {
  const forced = override?.trim().toLowerCase();
  if (forced === "platform" || forced === "portal") return "platform";
  if (forced === "company") return "company";
  return apiKey?.startsWith("zt_live_") ? "company" : "platform";
}

let cached: ServerConfig | null = null;

export function getServerConfig(): ServerConfig {
  if (cached) return cached;

  const apiKey = isPlaceholder(process.env.ZAPTASK_API_KEY)
    ? null
    : process.env.ZAPTASK_API_KEY!.trim();

  const scope = resolveScope(apiKey, process.env.ZAPTASK_API_SCOPE);

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
      scope,
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
