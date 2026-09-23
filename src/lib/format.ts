/**
 * Presentation helpers shared by the list, map popups and detail drawer.
 */

import { formatMoney } from "./listing";
import type { ListingType, Property, PropertyListing } from "./types";

export { formatMoney, formatPrice } from "./listing";

export function humanize(value: string | null | undefined): string {
  if (!value) return "—";
  const spaced = value.replace(/[_-]+/g, " ").trim();
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

export function bedroomsLabel(bedrooms: number | null | undefined): string | null {
  if (bedrooms === null || bedrooms === undefined) return null;
  if (bedrooms === 0) return "Studio";
  return `${bedrooms} bed`;
}

export function bathroomsLabel(bathrooms: number | null | undefined): string | null {
  if (bathrooms === null || bathrooms === undefined) return null;
  return `${bathrooms} bath`;
}

export function receptionsLabel(receptions: number | null | undefined): string | null {
  if (receptions === null || receptions === undefined) return null;
  return `${receptions} reception${receptions === 1 ? "" : "s"}`;
}

export function listingTypeLabel(type: ListingType | null | undefined): string | null {
  switch (type) {
    case "rent":
      return "To rent";
    case "sale":
      return "For sale";
    default:
      return null;
  }
}

export const listingTypeClasses: Record<ListingType, string> = {
  rent: "bg-sky-50 text-sky-700 ring-sky-600/20",
  sale: "bg-violet-50 text-violet-700 ring-violet-600/20",
};

export function furnishingLabel(value: string | null | undefined): string | null {
  switch (value) {
    case "furnished":
      return "Furnished";
    case "part_furnished":
      return "Part furnished";
    case "unfurnished":
      return "Unfurnished";
    default:
      return value ? humanize(value) : null;
  }
}

export function councilTaxLabel(band: string | null | undefined): string | null {
  if (!band) return null;
  if (band === "not_available") return "Not available";
  if (band === "exempt") return "Exempt";
  return `Band ${band.toUpperCase()}`;
}

/** EPC ratings use the standard A (best) → G (worst) colour scale. */
export function epcClasses(rating: string | null | undefined): string {
  switch ((rating ?? "").toUpperCase()) {
    case "A":
      return "bg-emerald-600 text-white";
    case "B":
      return "bg-emerald-500 text-white";
    case "C":
      return "bg-lime-500 text-white";
    case "D":
      return "bg-yellow-400 text-slate-900";
    case "E":
      return "bg-orange-400 text-white";
    case "F":
      return "bg-orange-600 text-white";
    case "G":
      return "bg-rose-600 text-white";
    default:
      return "bg-slate-200 text-slate-700";
  }
}

/** "Available now" once the date has passed, otherwise "Available from 28 Sep 2026". */
export function availabilityLabel(availableFrom: string | null | undefined): string | null {
  if (!availableFrom) return null;
  const date = new Date(`${availableFrom.slice(0, 10)}T00:00:00`);
  if (Number.isNaN(date.getTime())) return `Available from ${availableFrom}`;
  return date.getTime() <= Date.now() ? "Available now" : `Available from ${formatDate(availableFrom)}`;
}

/** Deposit shown next to price on rentals: "Deposit £2,019". */
export function depositLabel(listing: PropertyListing | null | undefined): string | null {
  const amount = listing?.depositAmount;
  if (amount === null || amount === undefined) return null;
  return `Deposit ${formatMoney(amount)}`;
}

/** Compact "3 bed · 1 bath · 2 receptions" summary shared by cards, popups and the drawer. */
export function roomsSummary(property: Pick<Property, "bedrooms" | "bathrooms" | "receptions">): string | null {
  const parts = [bedroomsLabel(property.bedrooms), bathroomsLabel(property.bathrooms), receptionsLabel(property.receptions)].filter(
    Boolean,
  );
  return parts.length > 0 ? parts.join(" · ") : null;
}

export type OccupancyTone = "emerald" | "amber" | "rose" | "slate";

export function occupancyTone(status: string | null | undefined): OccupancyTone {
  switch ((status ?? "").toLowerCase()) {
    case "occupied":
    case "let":
    case "tenanted":
      return "emerald";
    case "vacant":
    case "void":
    case "available":
      return "amber";
    case "notice_served":
    case "notice-served":
    case "arrears":
      return "rose";
    default:
      return "slate";
  }
}

/** Hex colours used for map markers; keep in sync with `toneClasses`. */
export const toneHex: Record<OccupancyTone, string> = {
  emerald: "#059669",
  amber: "#d97706",
  rose: "#e11d48",
  slate: "#64748b",
};

export const toneClasses: Record<OccupancyTone, string> = {
  emerald: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
  amber: "bg-amber-50 text-amber-700 ring-amber-600/20",
  rose: "bg-rose-50 text-rose-700 ring-rose-600/20",
  slate: "bg-slate-100 text-slate-700 ring-slate-500/20",
};

export function priorityClasses(priority: string | null | undefined): string {
  switch ((priority ?? "").toLowerCase()) {
    case "urgent":
    case "critical":
      return "bg-rose-50 text-rose-700 ring-rose-600/20";
    case "high":
      return "bg-orange-50 text-orange-700 ring-orange-600/20";
    case "low":
      return "bg-slate-100 text-slate-600 ring-slate-500/20";
    default:
      return "bg-brand-50 text-brand-700 ring-brand-600/20";
  }
}

export function statusClasses(status: string | null | undefined): string {
  switch ((status ?? "").toLowerCase()) {
    case "done":
    case "completed":
      return "bg-emerald-50 text-emerald-700 ring-emerald-600/20";
    case "in-progress":
    case "in_progress":
      return "bg-brand-50 text-brand-700 ring-brand-600/20";
    case "blocked":
    case "waiting":
      return "bg-amber-50 text-amber-700 ring-amber-600/20";
    case "cancelled":
      return "bg-slate-100 text-slate-500 ring-slate-500/20";
    default:
      return "bg-slate-100 text-slate-700 ring-slate-500/20";
  }
}

export function formatDate(value: string | null | undefined): string | null {
  if (!value) return null;
  const date = new Date(value.length === 10 ? `${value}T00:00:00` : value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
}

export function isOverdue(dueDate: string | null | undefined, completedAt: string | null | undefined): boolean {
  if (!dueDate || completedAt) return false;
  const due = new Date(`${dueDate}T23:59:59`);
  return due.getTime() < Date.now();
}

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
