"use client";

import { countActiveFilters, defaultFilters, type Filters, type SortKey } from "@/lib/filters";
import { humanize } from "@/lib/format";
import type { PropertiesResponse } from "@/lib/types";

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

export function FilterBar({ filters, facets, sort, onChange, onSortChange, unlocatedCount }: FilterBarProps) {
  const active = countActiveFilters(filters);
  const set = <K extends keyof Filters>(key: K, value: Filters[K]) => onChange({ ...filters, [key]: value });

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
          placeholder="Search name, reference or address"
          aria-label="Search properties"
          className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm shadow-sm placeholder:text-slate-400 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100"
        />
      </div>

      <div className="grid grid-cols-2 gap-2">
        <label className="block">
          <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-slate-500">Type</span>
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
          <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-slate-500">Bedrooms</span>
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
          <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-slate-500">Tenure</span>
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
          <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-slate-500">Occupancy</span>
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
          <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-slate-500">Status</span>
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

        <label className="block">
          <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-slate-500">Sort</span>
          <select className={selectClass} value={sort} onChange={(e) => onSortChange(e.target.value as SortKey)}>
            <option value="name">Name A–Z</option>
            <option value="updated">Recently updated</option>
            <option value="bedrooms">Most bedrooms</option>
          </select>
        </label>
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
