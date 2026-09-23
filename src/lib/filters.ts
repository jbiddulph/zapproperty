import type { ListingType, LngLat, Property } from "./types";

export interface Filters {
  query: string;
  listingType: ListingType | "";
  propertyType: string;
  minBedrooms: number | null;
  minBathrooms: number | null;
  /** Comparable price bounds (monthly-equivalent for rentals). */
  minPrice: number | null;
  maxPrice: number | null;
  /** Agent (company) name, portal mode only. */
  agent: string;
  furnishing: string;
  tenure: string;
  occupancy: string;
  status: string;
  inViewOnly: boolean;
  locatedOnly: boolean;
}

export const defaultFilters: Filters = {
  query: "",
  listingType: "",
  propertyType: "",
  minBedrooms: null,
  minBathrooms: null,
  minPrice: null,
  maxPrice: null,
  agent: "",
  furnishing: "",
  tenure: "",
  occupancy: "",
  status: "active",
  inViewOnly: false,
  locatedOnly: false,
};

/** [[west, south], [east, north]] */
export type Bounds = [LngLat, LngLat];

export function countActiveFilters(filters: Filters): number {
  let count = 0;
  if (filters.query.trim()) count += 1;
  if (filters.listingType) count += 1;
  if (filters.propertyType) count += 1;
  if (filters.minBedrooms !== null) count += 1;
  if (filters.minBathrooms !== null) count += 1;
  if (filters.minPrice !== null || filters.maxPrice !== null) count += 1;
  if (filters.agent) count += 1;
  if (filters.furnishing) count += 1;
  if (filters.tenure) count += 1;
  if (filters.occupancy) count += 1;
  if (filters.status !== defaultFilters.status) count += 1;
  if (filters.inViewOnly) count += 1;
  if (filters.locatedOnly) count += 1;
  return count;
}

function inBounds([lng, lat]: LngLat, bounds: Bounds): boolean {
  const [[west, south], [east, north]] = bounds;
  const lngOk = west <= east ? lng >= west && lng <= east : lng >= west || lng <= east;
  return lngOk && lat >= south && lat <= north;
}

function matchesQuery(property: Property, query: string): boolean {
  const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (terms.length === 0) return true;
  const haystack = [
    property.name,
    property.reference,
    property.fullAddress,
    property.propertyType,
    property.tenure,
    property.furnishing,
    property.occupancyStatus,
    property.listing?.priceLabel,
    property.agent?.name,
    property.listing?.epcRating ? `epc ${property.listing.epcRating}` : null,
    ...(property.listing?.keyFeatures ?? []),
    String(property.id),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  return terms.every((term) => haystack.includes(term));
}

function matchesPrice(property: Property, filters: Filters): boolean {
  if (filters.minPrice === null && filters.maxPrice === null) return true;
  const price = property.listing?.comparablePrice ?? null;
  // A price filter is a positive request for priced listings; POA/unpriced
  // sites drop out rather than slipping through.
  if (price === null) return false;
  if (filters.minPrice !== null && price < filters.minPrice) return false;
  if (filters.maxPrice !== null && price > filters.maxPrice) return false;
  return true;
}

export function applyFilters(properties: Property[], filters: Filters, bounds: Bounds | null): Property[] {
  return properties.filter((property) => {
    if (filters.status && filters.status !== "all" && property.status !== filters.status) return false;
    if (filters.listingType && property.listing?.listingType !== filters.listingType) return false;
    if (filters.propertyType && property.propertyType !== filters.propertyType) return false;
    if (filters.agent && property.agent?.name !== filters.agent) return false;
    if (filters.furnishing && property.furnishing !== filters.furnishing) return false;
    if (filters.tenure && property.tenure !== filters.tenure) return false;
    if (filters.occupancy && property.occupancyStatus !== filters.occupancy) return false;
    if (filters.minBedrooms !== null && (property.bedrooms ?? -1) < filters.minBedrooms) return false;
    if (filters.minBathrooms !== null && (property.bathrooms ?? -1) < filters.minBathrooms) return false;
    if (!matchesPrice(property, filters)) return false;
    if (filters.locatedOnly && !property.coordinates) return false;
    if (filters.inViewOnly && bounds) {
      if (!property.coordinates || !inBounds(property.coordinates, bounds)) return false;
    }
    return matchesQuery(property, filters.query);
  });
}

export type SortKey = "name" | "updated" | "bedrooms" | "price-asc" | "price-desc" | "available";

export const sortOptions: { value: SortKey; label: string }[] = [
  { value: "name", label: "Name A–Z" },
  { value: "updated", label: "Recently updated" },
  { value: "price-asc", label: "Price: low to high" },
  { value: "price-desc", label: "Price: high to low" },
  { value: "bedrooms", label: "Most bedrooms" },
  { value: "available", label: "Available soonest" },
];

const byName = (a: Property, b: Property) => a.name.localeCompare(b.name);

/** Unpriced (POA/blank) listings sort after priced ones in both directions. */
function byPrice(direction: 1 | -1) {
  return (a: Property, b: Property) => {
    const pa = a.listing?.comparablePrice ?? null;
    const pb = b.listing?.comparablePrice ?? null;
    if (pa === null && pb === null) return byName(a, b);
    if (pa === null) return 1;
    if (pb === null) return -1;
    return (pa - pb) * direction || byName(a, b);
  };
}

function byAvailability(a: Property, b: Property) {
  const da = a.listing?.availableFrom ?? null;
  const db = b.listing?.availableFrom ?? null;
  if (da === null && db === null) return byName(a, b);
  if (da === null) return 1;
  if (db === null) return -1;
  return da.localeCompare(db) || byName(a, b);
}

export function sortProperties(properties: Property[], key: SortKey): Property[] {
  const copy = [...properties];
  switch (key) {
    case "updated":
      return copy.sort((a, b) => (b.updatedAt ?? "").localeCompare(a.updatedAt ?? ""));
    case "bedrooms":
      return copy.sort((a, b) => (b.bedrooms ?? -1) - (a.bedrooms ?? -1) || byName(a, b));
    case "price-asc":
      return copy.sort(byPrice(1));
    case "price-desc":
      return copy.sort(byPrice(-1));
    case "available":
      return copy.sort(byAvailability);
    default:
      return copy.sort(byName);
  }
}
