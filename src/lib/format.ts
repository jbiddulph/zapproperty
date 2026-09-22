/**
 * Presentation helpers shared by the list, map popups and detail drawer.
 */

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
