import type { LngLat, Property } from "./types";

export interface Filters {
  query: string;
  propertyType: string;
  minBedrooms: number | null;
  tenure: string;
  occupancy: string;
  status: string;
  inViewOnly: boolean;
  locatedOnly: boolean;
}

export const defaultFilters: Filters = {
  query: "",
  propertyType: "",
  minBedrooms: null,
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
  if (filters.propertyType) count += 1;
  if (filters.minBedrooms !== null) count += 1;
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
    property.occupancyStatus,
    String(property.id),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  return terms.every((term) => haystack.includes(term));
}

export function applyFilters(properties: Property[], filters: Filters, bounds: Bounds | null): Property[] {
  return properties.filter((property) => {
    if (filters.status && filters.status !== "all" && property.status !== filters.status) return false;
    if (filters.propertyType && property.propertyType !== filters.propertyType) return false;
    if (filters.tenure && property.tenure !== filters.tenure) return false;
    if (filters.occupancy && property.occupancyStatus !== filters.occupancy) return false;
    if (filters.minBedrooms !== null && (property.bedrooms ?? -1) < filters.minBedrooms) return false;
    if (filters.locatedOnly && !property.coordinates) return false;
    if (filters.inViewOnly && bounds) {
      if (!property.coordinates || !inBounds(property.coordinates, bounds)) return false;
    }
    return matchesQuery(property, filters.query);
  });
}

export type SortKey = "name" | "updated" | "bedrooms";

export function sortProperties(properties: Property[], key: SortKey): Property[] {
  const copy = [...properties];
  switch (key) {
    case "updated":
      return copy.sort((a, b) => (b.updatedAt ?? "").localeCompare(a.updatedAt ?? ""));
    case "bedrooms":
      return copy.sort((a, b) => (b.bedrooms ?? -1) - (a.bedrooms ?? -1) || a.name.localeCompare(b.name));
    default:
      return copy.sort((a, b) => a.name.localeCompare(b.name));
  }
}
