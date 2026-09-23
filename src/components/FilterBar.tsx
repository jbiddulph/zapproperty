"use client";

import { useState } from "react";
import { countActiveFilters, defaultFilters, sortOptions, type Filters, type SortKey } from "@/lib/filters";
import { furnishingLabel, humanize, listingTypeLabel } from "@/lib/format";
import type { ListingType, PropertiesResponse } from "@/lib/types";

interface FilterBarProps {
  filters: Filters;
  facets: PropertiesResponse["meta"]["facets"] | null;
  sort: SortKey;
  onChange: (next: Filters) => void;
  onSortChange: (sort: SortKey) => void;
  unlocatedCount: number;
}

const selectClass =
  "w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-sm text-slate-800 shadow-sm focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100 disabled:bg-slate-50 disabled:text-slate-400";

const inputClass =
  "w-full rounded-lg border border-slate-200 bg-white py-1.5 pl-6 pr-2 text-sm text-slate-800 shadow-sm placeholder:text-slate-400 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100";

function Label({ children }: { children: React.ReactNode }) {
  return <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-slate-500">{children}</span>;
}

function parseAmount(raw: string): number | null {
  const digits = raw.replace(/[^\d]/g, "");
  if (!digits) return null;
  const value = Number.parseInt(digits, 10);
  return Number.isFinite(value) ? value : null;
}

/** Round facet bounds to friendly placeholders, e.g. 1,732 → "1,700". */
function placeholderFor(value: number | undefined, listingType: ListingType | ""): string {
  if (value === undefined) return listingType === "sale" ? "e.g. 250,000" : "e.g. 1,200";
  const step = value >= 100_000 ? 5_000 : value >= 10_000 ? 500 : 50;
  return (Math.round(value / step) * step).toLocaleString("en-GB");
}

export function FilterBar({ filters, facets, sort, onChange, onSortChange, unlocatedCount }: FilterBarProps) {
  const active = countActiveFilters(filters);
  const set = <K extends keyof Filters>(key: K, value: Filters[K]) => onChange({ ...filters, [key]: value });

  const hasListings = Boolean(facets && facets.listingTypes.length > 0);
  const range = filters.listingType ? facets?.priceRange[filters.listingType] : undefined;
  const priceUnit = filters.listingType === "sale" ? "" : filters.listingType === "rent" ? "pcm" : "";

  const moreCount =
    (filters.minBathrooms !== null ? 1 : 0) +
    (filters.agent ? 1 : 0) +
    (filters.furnishing ? 1 : 0) +
    (filters.tenure ? 1 : 0) +
    (filters.occupancy ? 1 : 0) +
    (filters.status !== defaultFilters.status ? 1 : 0);
  const [moreOpen, setMoreOpen] = useState(false);
  const showMore = moreOpen || moreCount > 0;

  return (
    <div className="space-y-3">
      <div className="relative">
        <svg
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
          viewBox="0 0 20 20"
          fill="currentColor"
          aria-hidden
        >
          <path
            fillRule="evenodd"
            d="M9 3.5a5.5 5.5 0 100 11 5.5 5.5 0 000-11zM2 9a7 7 0 1112.452 4.391l3.328 3.329a.75.75 0 11-1.06 1.06l-3.329-3.328A7 7 0 012 9z"
            clipRule="evenodd"
          />
        </svg>
        <input
          type="search"
          value={filters.query}
          onChange={(e) => set("query", e.target.value)}
          placeholder="Search name, address, features or EPC"
          aria-label="Search properties"
          className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm shadow-sm placeholder:text-slate-400 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100"
        />
      </div>

      {hasListings && (
        <div role="group" aria-label="Listing type" className="grid grid-cols-3 gap-1 rounded-xl bg-slate-100 p-1 text-sm">
          {(["", "rent", "sale"] as const).map((value) => {
            const enabled = value === "" || facets?.listingTypes.includes(value);
            const selected = filters.listingType === value;
            return (
              <button
                key={value || "any"}
                type="button"
                disabled={!enabled}
                aria-pressed={selected}
                onClick={() => onChange({ ...filters, listingType: value, minPrice: null, maxPrice: null })}
                className={`rounded-lg px-2 py-1.5 font-medium transition ${
                  selected
                    ? "bg-white text-slate-900 shadow-sm ring-1 ring-slate-200"
                    : enabled
                      ? "text-slate-600 hover:text-slate-900"
                      : "cursor-not-allowed text-slate-300"
                }`}
              >
                {value === "" ? "All" : listingTypeLabel(value)}
              </button>
            );
          })}
        </div>
      )}

      <div className="grid grid-cols-2 gap-2">
        {hasListings && (
          <div className="col-span-2">
            <Label>
              Price{priceUnit ? <span className="ml-1 font-normal normal-case text-slate-400">({priceUnit})</span> : null}
            </Label>
            <div className="grid grid-cols-2 gap-2">
              <div className="relative">
                <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-sm text-slate-400">£</span>
                <input
                  type="text"
                  inputMode="numeric"
                  value={filters.minPrice === null ? "" : filters.minPrice.toLocaleString("en-GB")}
                  onChange={(e) => set("minPrice", parseAmount(e.target.value))}
                  placeholder={`Min ${placeholderFor(range?.min, filters.listingType)}`}
                  aria-label="Minimum price"
                  className={inputClass}
                />
              </div>
              <div className="relative">
                <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-sm text-slate-400">£</span>
                <input
                  type="text"
                  inputMode="numeric"
                  value={filters.maxPrice === null ? "" : filters.maxPrice.toLocaleString("en-GB")}
                  onChange={(e) => set("maxPrice", parseAmount(e.target.value))}
                  placeholder={`Max ${placeholderFor(range?.max, filters.listingType)}`}
                  aria-label="Maximum price"
                  className={inputClass}
                />
              </div>
            </div>
          </div>
        )}

        <label className="block">
          <Label>Type</Label>
          <select
            className={selectClass}
            value={filters.propertyType}
            onChange={(e) => set("propertyType", e.target.value)}
            disabled={!facets || facets.propertyTypes.length === 0}
          >
            <option value="">Any type</option>
            {facets?.propertyTypes.map((t) => (
              <option key={t} value={t}>
                {humanize(t)}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <Label>Bedrooms</Label>
          <select
            className={selectClass}
            value={filters.minBedrooms ?? ""}
            onChange={(e) => set("minBedrooms", e.target.value === "" ? null : Number(e.target.value))}
          >
            <option value="">Any</option>
            <option value="0">Studio+</option>
            <option value="1">1+</option>
            <option value="2">2+</option>
            <option value="3">3+</option>
            <option value="4">4+</option>
            <option value="5">5+</option>
          </select>
        </label>

        <label className="block">
          <Label>Sort</Label>
          <select className={selectClass} value={sort} onChange={(e) => onSortChange(e.target.value as SortKey)}>
            {sortOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <div className="flex items-end">
          <button
            type="button"
            onClick={() => setMoreOpen((open) => !open)}
            aria-expanded={showMore}
            className="inline-flex h-[34px] w-full items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50"
          >
            {showMore ? "Fewer filters" : "More filters"}
            {moreCount > 0 && (
              <span className="rounded-full bg-brand-600 px-1.5 text-[11px] font-semibold text-white">{moreCount}</span>
            )}
          </button>
        </div>

        {showMore && (
          <>
            <label className="block">
              <Label>Bathrooms</Label>
              <select
                className={selectClass}
                value={filters.minBathrooms ?? ""}
                onChange={(e) => set("minBathrooms", e.target.value === "" ? null : Number(e.target.value))}
              >
                <option value="">Any</option>
                <option value="1">1+</option>
                <option value="2">2+</option>
                <option value="3">3+</option>
              </select>
            </label>

            {facets && facets.agents.length > 1 && (
              <label className="block">
                <Label>Agent</Label>
                <select className={selectClass} value={filters.agent} onChange={(e) => set("agent", e.target.value)}>
                  <option value="">Any agent</option>
                  {facets.agents.map((a) => (
                    <option key={a} value={a}>
                      {a}
                    </option>
                  ))}
                </select>
              </label>
            )}

            <label className="block">
              <Label>Furnishing</Label>
              <select
                className={selectClass}
                value={filters.furnishing}
                onChange={(e) => set("furnishing", e.target.value)}
                disabled={!facets || facets.furnishings.length === 0}
              >
                <option value="">Any</option>
                {facets?.furnishings.map((f) => (
                  <option key={f} value={f}>
                    {furnishingLabel(f)}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <Label>Tenure</Label>
              <select
                className={selectClass}
                value={filters.tenure}
                onChange={(e) => set("tenure", e.target.value)}
                disabled={!facets || facets.tenures.length === 0}
              >
                <option value="">Any tenure</option>
                {facets?.tenures.map((t) => (
                  <option key={t} value={t}>
                    {humanize(t)}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <Label>Occupancy</Label>
              <select
                className={selectClass}
                value={filters.occupancy}
                onChange={(e) => set("occupancy", e.target.value)}
                disabled={!facets || facets.occupancyStatuses.length === 0}
              >
                <option value="">Any occupancy</option>
                {facets?.occupancyStatuses.map((t) => (
                  <option key={t} value={t}>
                    {humanize(t)}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <Label>Status</Label>
              <select className={selectClass} value={filters.status} onChange={(e) => set("status", e.target.value)}>
                <option value="active">Active</option>
                {facets?.statuses
                  .filter((s) => s !== "active")
                  .map((s) => (
                    <option key={s} value={s}>
                      {humanize(s)}
                    </option>
                  ))}
                <option value="all">All statuses</option>
              </select>
            </label>
          </>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
        <label className="inline-flex cursor-pointer items-center gap-2 text-slate-700">
          <input
            type="checkbox"
            checked={filters.inViewOnly}
            onChange={(e) => set("inViewOnly", e.target.checked)}
            className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
          />
          Only in map view
        </label>
        {unlocatedCount > 0 && (
          <label className="inline-flex cursor-pointer items-center gap-2 text-slate-700">
            <input
              type="checkbox"
              checked={filters.locatedOnly}
              onChange={(e) => set("locatedOnly", e.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
            />
            Hide unmapped ({unlocatedCount})
          </label>
        )}
        {active > 0 && (
          <button
            type="button"
            onClick={() => onChange({ ...defaultFilters })}
            className="ml-auto text-sm font-medium text-brand-700 hover:text-brand-800"
          >
            Reset {active > 1 ? `${active} filters` : "filter"}
          </button>
        )}
      </div>
    </div>
  );
}
