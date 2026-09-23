import { getServerConfig } from "./config";
import { demoAssets, demoCreateTask, demoTasksFor } from "./demo-data";
import { geocodeAddress, normaliseAddress } from "./geocode";
import { listingFactsFromAsset } from "./listing";
import type {
  AppStatus,
  GeocodeSource,
  ListingType,
  LngLat,
  PropertiesResponse,
  Property,
  PropertyDetail,
  PropertyPhoto,
  PropertyTask,
} from "./types";
import { ZapTaskClient, type CreateTaskInput, type ZapTaskAsset, type ZapTaskTask } from "./zaptask";

const LIST_CACHE_TTL_MS = 60_000;

let client: ZapTaskClient | null | undefined;

function getClient(): ZapTaskClient | null {
  if (client !== undefined) return client;
  const { zaptask, demo } = getServerConfig();
  client = !demo && zaptask.apiKey ? new ZapTaskClient({ baseUrl: zaptask.baseUrl, apiKey: zaptask.apiKey }) : null;
  return client;
}

export function getAppStatus(): AppStatus {
  const config = getServerConfig();
  return {
    demo: config.demo,
    zaptaskConfigured: Boolean(config.zaptask.apiKey),
    zaptaskBaseUrl: config.zaptask.baseUrl,
    mapboxConfigured: Boolean(process.env.NEXT_PUBLIC_MAPBOX_TOKEN && !process.env.NEXT_PUBLIC_MAPBOX_TOKEN.includes("replace_me")),
    tasksEnabled: true,
  };
}

// ---------------------------------------------------------------------------
// Coordinates
// ---------------------------------------------------------------------------

function asNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function validLngLat(lng: number | null, lat: number | null): LngLat | null {
  if (lng === null || lat === null) return null;
  if (Math.abs(lng) > 180 || Math.abs(lat) > 90) return null;
  if (lng === 0 && lat === 0) return null;
  return [lng, lat];
}

/**
 * Sites may already carry coordinates in `metadata` (written by this app,
 * an import, or another ZapTask app). Accept the common spellings.
 */
export function coordinatesFromMetadata(metadata: Record<string, unknown> | null | undefined): LngLat | null {
  if (!metadata) return null;

  const geo = metadata.geo as Record<string, unknown> | undefined;
  if (geo && typeof geo === "object") {
    const fromGeo = validLngLat(asNumber(geo.lng ?? geo.longitude), asNumber(geo.lat ?? geo.latitude));
    if (fromGeo) return fromGeo;
  }

  const direct = validLngLat(
    asNumber(metadata.longitude ?? metadata.lng ?? metadata.lon),
    asNumber(metadata.latitude ?? metadata.lat),
  );
  if (direct) return direct;

  const pair = metadata.coordinates;
  if (Array.isArray(pair) && pair.length >= 2) {
    return validLngLat(asNumber(pair[0]), asNumber(pair[1]));
  }

  return null;
}

// ---------------------------------------------------------------------------
// Transforms
// ---------------------------------------------------------------------------

function photoIdFromUrl(url: string | null | undefined): number | null {
  if (!url) return null;
  const match = url.match(/\/photos\/(\d+)(?:[/?#]|$)/);
  return match ? Number(match[1]) : null;
}

function proxyPhotoUrl(assetId: number, originalUrl: string | null | undefined): string | null {
  const photoId = photoIdFromUrl(originalUrl);
  return photoId === null ? null : `/api/properties/${assetId}/photos/${photoId}`;
}

function toProperty(asset: ZapTaskAsset, coordinates: LngLat | null, geocodeSource: GeocodeSource): Property {
  const { zaptask } = getServerConfig();
  const address = {
    line1: asset.address?.line_1 ?? null,
    line2: asset.address?.line_2 ?? null,
    city: asset.address?.city ?? null,
    postalCode: asset.address?.postal_code ?? null,
    country: asset.address?.country ?? null,
  };

  return {
    id: asset.id,
    name: asset.name,
    reference: asset.reference ?? null,
    type: asset.type,
    status: asset.status ?? "active",
    clientId: asset.client_id ?? null,
    ...listingFactsFromAsset(asset),
    occupancyStatus: asset.property?.occupancy_status ?? null,
    address,
    fullAddress: normaliseAddress([address.line1, address.line2, address.city, address.postalCode, address.country]),
    coordinates,
    geocodeSource,
    photoCount: asset.photo_count ?? asset.photos?.length ?? 0,
    coverPhotoUrl: proxyPhotoUrl(asset.id, asset.cover_photo_url),
    zaptaskUrl: `${zaptask.baseUrl}/sites/${asset.id}`,
    updatedAt: asset.updated_at ?? null,
  };
}

function toTask(task: ZapTaskTask): PropertyTask {
  return {
    id: task.id,
    title: task.title,
    status: task.status,
    priority: task.priority,
    category: task.category ?? null,
    dueDate: task.due_date ?? null,
    assignedTo: task.assigned_to ?? null,
    completedAt: task.completed_at ?? null,
  };
}

// ---------------------------------------------------------------------------
// Locating assets
// ---------------------------------------------------------------------------

async function locate(asset: ZapTaskAsset): Promise<{ coordinates: LngLat | null; source: GeocodeSource }> {
  const fromMetadata = coordinatesFromMetadata(asset.metadata);
  if (fromMetadata) return { coordinates: fromMetadata, source: "metadata" };

  const { mapbox } = getServerConfig();
  const address = normaliseAddress([
    asset.address?.line_1,
    asset.address?.line_2,
    asset.address?.city,
    asset.address?.postal_code,
    asset.address?.country,
  ]);

  if (!address || !mapbox.serverToken) return { coordinates: null, source: "none" };

  const result = await geocodeAddress(address, { token: mapbox.serverToken, country: mapbox.geocodeCountry });
  return result ? { coordinates: result.coordinates, source: "mapbox" } : { coordinates: null, source: "none" };
}

async function writeBackCoordinates(zt: ZapTaskClient, asset: ZapTaskAsset, coordinates: LngLat): Promise<void> {
  try {
    await zt.assets.update(asset.id, {
      metadata: {
        ...(asset.metadata ?? {}),
        geo: { lng: coordinates[0], lat: coordinates[1], source: "mapbox", geocoded_at: new Date().toISOString() },
      },
    });
  } catch (error) {
    console.warn(`[zapproperty] could not write coordinates back to asset ${asset.id}:`, (error as Error).message);
  }
}

// ---------------------------------------------------------------------------
// Public loaders
// ---------------------------------------------------------------------------

let listCache: { value: PropertiesResponse; expiresAt: number } | null = null;
let listInFlight: Promise<PropertiesResponse> | null = null;

export async function loadProperties(options: { refresh?: boolean } = {}): Promise<PropertiesResponse> {
  if (!options.refresh && listCache && listCache.expiresAt > Date.now()) return listCache.value;
  if (listInFlight) return listInFlight;

  listInFlight = (async () => {
    try {
      const value = await buildPropertiesResponse();
      listCache = { value, expiresAt: Date.now() + LIST_CACHE_TTL_MS };
      return value;
    } finally {
      listInFlight = null;
    }
  })();

  return listInFlight;
}

async function buildPropertiesResponse(): Promise<PropertiesResponse> {
  const config = getServerConfig();
  const zt = getClient();

  let fetched: ZapTaskAsset[];
  if (zt) {
    fetched = await zt.listAllAssets({ type: config.zaptask.assetType ?? undefined }, config.zaptask.maxAssets);
  } else {
    fetched = config.zaptask.assetType
      ? demoAssets.filter((a) => a.type === config.zaptask.assetType)
      : demoAssets;
  }

  // The Platform API has no server-side filter for the agent's "Show on
  // ZapProperty" checkbox, so apply it here — before geocoding, so hidden
  // sites never cost a Mapbox call.
  const assets = config.zaptask.includeUnlisted
    ? fetched
    : fetched.filter((asset) => asset.property?.listing?.show_on_zapproperty === true);
  const unlisted = fetched.length - assets.length;

  const located = await Promise.all(assets.map((asset) => locate(asset)));

  if (zt && config.zaptask.writeBackGeocode) {
    await Promise.allSettled(
      assets.map((asset, i) => {
        const { coordinates, source } = located[i];
        return source === "mapbox" && coordinates ? writeBackCoordinates(zt, asset, coordinates) : Promise.resolve();
      }),
    );
  }

  const properties = assets.map((asset, i) => toProperty(asset, located[i].coordinates, located[i].source));
  const distinct = (pick: (p: Property) => string | null) =>
    Array.from(new Set(properties.map(pick).filter((v): v is string => Boolean(v)))).sort();

  return {
    properties,
    meta: {
      total: properties.length,
      located: properties.filter((p) => p.coordinates).length,
      unlocated: properties.filter((p) => !p.coordinates).length,
      unlisted,
      includesUnlisted: config.zaptask.includeUnlisted,
      source: zt ? "zaptask" : "demo",
      assetType: config.zaptask.assetType,
      fetchedAt: new Date().toISOString(),
      facets: {
        propertyTypes: distinct((p) => p.propertyType),
        tenures: distinct((p) => p.tenure),
        occupancyStatuses: distinct((p) => p.occupancyStatus),
        statuses: distinct((p) => p.status),
        types: distinct((p) => p.type),
        listingTypes: distinct((p) => p.listing?.listingType ?? null) as ListingType[],
        furnishings: distinct((p) => p.furnishing),
        priceRange: priceRangeByListingType(properties),
      },
    },
  };
}

function priceRangeByListingType(properties: Property[]): PropertiesResponse["meta"]["facets"]["priceRange"] {
  const range: PropertiesResponse["meta"]["facets"]["priceRange"] = {};
  for (const property of properties) {
    const type = property.listing?.listingType;
    const price = property.listing?.comparablePrice;
    if (!type || price === null || price === undefined) continue;
    const current = range[type];
    range[type] = current
      ? { min: Math.min(current.min, price), max: Math.max(current.max, price) }
      : { min: price, max: price };
  }
  return range;
}

export async function loadPropertyDetail(id: number): Promise<PropertyDetail | null> {
  const zt = getClient();

  let asset: ZapTaskAsset | null;
  if (zt) {
    asset = await zt.assets.get(id);
  } else {
    asset = demoAssets.find((a) => a.id === id) ?? null;
  }
  if (!asset) return null;

  const { zaptask } = getServerConfig();
  if (!zaptask.includeUnlisted && asset.property?.listing?.show_on_zapproperty !== true) return null;

  const { coordinates, source } = await locate(asset);
  const base = toProperty(asset, coordinates, source);

  const photos: PropertyPhoto[] = (asset.photos ?? []).map((photo) => ({
    id: photo.id,
    caption: photo.caption ?? null,
    isCover: Boolean(photo.is_cover),
    url: `/api/properties/${asset.id}/photos/${photo.id}`,
    mimeType: photo.mime_type,
  }));

  return {
    ...base,
    photos,
    metadata: asset.metadata ?? null,
    createdAt: asset.created_at ?? null,
  };
}

export async function fetchPropertyPhoto(assetId: number, photoId: number): Promise<Response | null> {
  const zt = getClient();
  if (!zt) return null;
  return zt.assets.photo(assetId, photoId);
}

export async function loadPropertyTasks(assetId: number): Promise<PropertyTask[]> {
  const zt = getClient();
  if (!zt) return demoTasksFor(assetId).map(toTask);

  const { tasks } = await zt.tasks.list({ asset_id: assetId, per_page: 50 });
  return tasks.map(toTask);
}

export async function createPropertyTask(
  assetId: number,
  input: Omit<CreateTaskInput, "asset_id" | "source">,
): Promise<PropertyTask> {
  const zt = getClient();
  if (!zt) {
    return toTask(demoCreateTask({ ...input, asset_id: assetId }));
  }

  const task = await zt.tasks.create({
    ...input,
    asset_id: assetId,
    source: "zapproperty",
    metadata: { app: "zapproperty", ...(input.metadata ?? {}) },
  });
  return toTask(task);
}
