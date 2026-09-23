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

export type ListingType = "rent" | "sale";

/**
 * Estate-agent listing details entered in ZapTask. Fields the agent has
 * hidden via the per-section visibility toggles are already nulled out
 * server-side, so anything present here is safe to display.
 */
export interface PropertyListing {
  listingType: ListingType | null;
  priceAmount: number | null;
  priceQualifier: string | null;
  /** Display string, e.g. "£1,750 pcm", "Offers over £450,000", "POA". */
  priceLabel: string | null;
  /**
   * Price normalised for sorting/filtering: monthly-equivalent for rentals
   * (pw × 52 ÷ 12, pa ÷ 12), the asking figure for sales. Null when POA/unset.
   */
  comparablePrice: number | null;
  depositAmount: number | null;
  /** ISO date (YYYY-MM-DD). */
  availableFrom: string | null;
  councilTaxBand: string | null;
  epcRating: string | null;
  broadband: string | null;
  keyFeatures: string[];
  description: string | null;
}

/** The estate agent (ZapTask company) marketing a property. */
export interface PropertyAgent {
  id: number;
  name: string;
  logoUrl: string | null;
  website: string | null;
}

export interface Property {
  id: number;
  name: string;
  reference: string | null;
  type: string;
  status: string;
  clientId: number | null;
  /** Known when reading through the ZapProperty portal; null for a single-company key. */
  agent: PropertyAgent | null;
  propertyType: string | null;
  bedrooms: number | null;
  bathrooms: number | null;
  receptions: number | null;
  tenure: string | null;
  furnishing: string | null;
  occupancyStatus: string | null;
  /** The agent's "Show on ZapProperty" checkbox in ZapTask. */
  listed: boolean;
  /** Null when the site has no listing details at all. */
  listing: PropertyListing | null;
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
    /** Sites skipped because "Show on ZapProperty" is unticked in ZapTask. */
    unlisted: number;
    /** True when unlisted sites are being included (ZAPTASK_INCLUDE_UNLISTED). */
    includesUnlisted: boolean;
    source: "zaptask" | "demo";
    /** `platform` = portal key across all companies; `company` = one company's key. */
    scope: "platform" | "company";
    assetType: string | null;
    fetchedAt: string;
    /** Distinct values available for the filter controls. */
    facets: {
      agents: string[];
      propertyTypes: string[];
      tenures: string[];
      occupancyStatuses: string[];
      statuses: string[];
      types: string[];
      listingTypes: ListingType[];
      furnishings: string[];
      /** Comparable price bounds per listing type, for the price inputs. */
      priceRange: Partial<Record<ListingType, { min: number; max: number }>>;
    };
  };
}

export interface AppStatus {
  demo: boolean;
  zaptaskConfigured: boolean;
  zaptaskBaseUrl: string;
  zaptaskScope: "platform" | "company";
  mapboxConfigured: boolean;
  tasksEnabled: boolean;
}

export interface ApiError {
  error: string;
  status?: number;
}
