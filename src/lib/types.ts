/**
 * Shapes shared between route handlers and client components.
 * Everything here is JSON-serialisable and free of secrets.
 */

export type LngLat = [number, number];

export type GeocodeSource = "metadata" | "mapbox" | "none";

export interface PropertyAddress {
  line1: string | null;
  line2: string | null;
  city: string | null;
  postalCode: string | null;
  country: string | null;
}

export interface Property {
  id: number;
  name: string;
  reference: string | null;
  type: string;
  status: string;
  clientId: number | null;
  propertyType: string | null;
  bedrooms: number | null;
  tenure: string | null;
  occupancyStatus: string | null;
  address: PropertyAddress;
  fullAddress: string;
  coordinates: LngLat | null;
  geocodeSource: GeocodeSource;
  photoCount: number;
  /** Same-origin proxy URL (the ZapTask original needs a bearer token). */
  coverPhotoUrl: string | null;
  /** Deep link to the site in the ZapTask dashboard. */
  zaptaskUrl: string;
  updatedAt: string | null;
}

export interface PropertyPhoto {
  id: number;
  caption: string | null;
  isCover: boolean;
  url: string;
  mimeType: string;
}

export interface PropertyDetail extends Property {
  photos: PropertyPhoto[];
  metadata: Record<string, unknown> | null;
  createdAt: string | null;
}

export interface PropertyTask {
  id: number;
  title: string;
  status: string;
  priority: string;
  category: string | null;
  dueDate: string | null;
  assignedTo: string | null;
  completedAt: string | null;
}

export interface PropertiesResponse {
  properties: Property[];
  meta: {
    total: number;
    located: number;
    unlocated: number;
    source: "zaptask" | "demo";
    assetType: string | null;
    fetchedAt: string;
    /** Distinct values available for the filter controls. */
    facets: {
      propertyTypes: string[];
      tenures: string[];
      occupancyStatuses: string[];
      statuses: string[];
      types: string[];
    };
  };
}

export interface AppStatus {
  demo: boolean;
  zaptaskConfigured: boolean;
  zaptaskBaseUrl: string;
  mapboxConfigured: boolean;
  tasksEnabled: boolean;
}

export interface ApiError {
  error: string;
  status?: number;
}
