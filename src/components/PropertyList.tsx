"use client";

import { useEffect, useRef } from "react";
import { PropertyCard } from "./PropertyCard";
import type { Property } from "@/lib/types";

interface PropertyListProps {
  properties: Property[];
  total: number;
  loading: boolean;
  error: string | null;
  selectedId: number | null;
  hoveredId: number | null;
  onSelect: (id: number) => void;
  onHover: (id: number | null) => void;
  onRetry: () => void;
}

export function PropertyList({
  properties,
  total,
  loading,
  error,
  selectedId,
  hoveredId,
  onSelect,
  onHover,
  onRetry,
}: PropertyListProps) {
  const listRef = useRef<HTMLUListElement | null>(null);

  // Keep the selected card in view when selection comes from the map.
  useEffect(() => {
    if (selectedId === null || !listRef.current) return;
    const el = listRef.current.querySelector<HTMLElement>(`[data-property-id="${selectedId}"]`);
    el?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [selectedId]);

  if (loading) {
    return (
      <ul className="space-y-2" aria-busy>
        {Array.from({ length: 6 }).map((_, i) => (
          <li key={i} className="flex gap-3 rounded-xl border border-slate-200 bg-white p-3">
            <div className="h-16 w-20 animate-pulse rounded-lg bg-slate-100" />
            <div className="flex-1 space-y-2 py-1">
              <div className="h-3.5 w-2/3 animate-pulse rounded bg-slate-100" />
              <div className="h-3 w-full animate-pulse rounded bg-slate-100" />
              <div className="h-3 w-1/2 animate-pulse rounded bg-slate-100" />
            </div>
          </li>
        ))}
      </ul>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
        <p className="font-semibold">Couldn&apos;t load properties</p>
        <p className="mt-1">{error}</p>
        <button
          type="button"
          onClick={onRetry}
          className="mt-3 rounded-lg bg-white px-3 py-1.5 text-sm font-medium text-rose-700 ring-1 ring-inset ring-rose-200 hover:bg-rose-100"
        >
          Try again
        </button>
      </div>
    );
  }

  if (properties.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-slate-300 bg-white p-6 text-center text-sm text-slate-500">
        {total === 0 ? (
          <>
            <p className="font-medium text-slate-700">No property sites yet</p>
            <p className="mt-1">Add sites in ZapTask (Sites) and they will appear here.</p>
          </>
        ) : (
          <>
            <p className="font-medium text-slate-700">No properties match</p>
            <p className="mt-1">Try widening the map view or clearing a filter.</p>
          </>
        )}
      </div>
    );
  }

  return (
    <ul ref={listRef} className="space-y-2">
      {properties.map((property) => (
        <PropertyCard
          key={property.id}
          property={property}
          selected={property.id === selectedId}
          hovered={property.id === hoveredId}
          onSelect={() => onSelect(property.id)}
          onHover={(hovering) => onHover(hovering ? property.id : null)}
        />
      ))}
    </ul>
  );
}
