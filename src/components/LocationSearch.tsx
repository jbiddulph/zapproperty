"use client";

import { useEffect, useId, useRef, useState } from "react";
import type { Bounds } from "@/lib/filters";
import type { LngLat } from "@/lib/types";

export interface PlaceResult {
  id: string;
  name: string;
  fullAddress: string;
  featureType: string;
  center: LngLat;
  bounds: Bounds | null;
}

interface LocationSearchProps {
  token: string;
  country: string | null;
  proximity: LngLat | null;
  onSelect: (place: PlaceResult) => void;
}

interface MapboxV6Feature {
  id: string;
  geometry: { coordinates: [number, number] };
  properties: {
    name?: string;
    name_preferred?: string;
    full_address?: string;
    place_formatted?: string;
    feature_type?: string;
    bbox?: [number, number, number, number];
  };
}

export function zoomForFeatureType(type: string): number {
  switch (type) {
    case "address":
      return 16;
    case "street":
    case "postcode":
      return 15;
    case "neighborhood":
    case "locality":
      return 13.5;
    case "place":
      return 12;
    case "district":
      return 10;
    case "region":
      return 8;
    case "country":
      return 5;
    default:
      return 12;
  }
}

function newSessionToken(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function LocationSearch({ token, country, proximity, onSelect }: LocationSearchProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<PlaceResult[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const sessionRef = useRef<string>(newSessionToken());
  const abortRef = useRef<AbortController | null>(null);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const listId = useId();

  useEffect(() => {
    const trimmed = query.trim();
    const shouldSearch = Boolean(token) && trimmed.length >= 2;

    const handle = setTimeout(async () => {
      abortRef.current?.abort();
      if (!shouldSearch) {
        setResults([]);
        setLoading(false);
        return;
      }

      const controller = new AbortController();
      abortRef.current = controller;
      setLoading(true);

      try {
        const url = new URL("https://api.mapbox.com/search/geocode/v6/forward");
        url.searchParams.set("q", trimmed);
        url.searchParams.set("autocomplete", "true");
        url.searchParams.set("limit", "6");
        url.searchParams.set("access_token", token);
        url.searchParams.set("session_token", sessionRef.current);
        if (country) url.searchParams.set("country", country);
        if (proximity) url.searchParams.set("proximity", `${proximity[0]},${proximity[1]}`);

        const response = await fetch(url, { signal: controller.signal });
        if (!response.ok) throw new Error(`Geocoding failed (${response.status})`);
        const json = (await response.json()) as { features?: MapboxV6Feature[] };

        setResults(
          (json.features ?? []).map((f) => {
            const bbox = f.properties.bbox;
            return {
              id: f.id,
              name: f.properties.name_preferred ?? f.properties.name ?? f.properties.full_address ?? "Unknown place",
              fullAddress: f.properties.full_address ?? f.properties.place_formatted ?? "",
              featureType: f.properties.feature_type ?? "place",
              center: f.geometry.coordinates,
              bounds: bbox ? [[bbox[0], bbox[1]], [bbox[2], bbox[3]]] : null,
            };
          }),
        );
        setOpen(true);
        setActiveIndex(-1);
      } catch (error) {
        if ((error as Error).name !== "AbortError") setResults([]);
      } finally {
        setLoading(false);
      }
    }, shouldSearch ? 250 : 0);

    return () => clearTimeout(handle);
  }, [query, token, country, proximity]);

  useEffect(() => {
    function onDocumentClick(event: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDocumentClick);
    return () => document.removeEventListener("mousedown", onDocumentClick);
  }, []);

  function choose(place: PlaceResult) {
    onSelect(place);
    setQuery(place.name);
    setOpen(false);
    // A new session starts once a result is picked (Mapbox session billing).
    sessionRef.current = newSessionToken();
  }

  function onKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (!open || results.length === 0) return;
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((i) => (i + 1) % results.length);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((i) => (i <= 0 ? results.length - 1 : i - 1));
    } else if (event.key === "Enter" && activeIndex >= 0) {
      event.preventDefault();
      choose(results[activeIndex]);
    } else if (event.key === "Escape") {
      setOpen(false);
    }
  }

  const disabled = !token;

  return (
    <div ref={rootRef} className="relative w-full">
      <label className="sr-only" htmlFor={`${listId}-input`}>
        Go to a town, postcode or address
      </label>
      <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-sm transition focus-within:border-brand-400 focus-within:ring-2 focus-within:ring-brand-100">
        <svg className="h-4 w-4 shrink-0 text-slate-400" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
          <path
            fillRule="evenodd"
            d="M9.69 18.933l.003.001C9.89 19.02 10 19 10 19s.11.02.308-.066l.002-.001.006-.003.018-.008a5.741 5.741 0 00.281-.14c.186-.096.446-.24.757-.433.62-.384 1.445-.966 2.274-1.765C15.302 14.988 17 12.493 17 9A7 7 0 103 9c0 3.492 1.698 5.988 3.355 7.584a13.731 13.731 0 002.273 1.765 11.842 11.842 0 00.976.544l.062.029.018.008.006.003zM10 11.25a2.25 2.25 0 100-4.5 2.25 2.25 0 000 4.5z"
            clipRule="evenodd"
          />
        </svg>
        <input
          id={`${listId}-input`}
          type="text"
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
          autoComplete="off"
          disabled={disabled}
          placeholder={disabled ? "Add a Mapbox token to search places" : "Go to a town, postcode or address…"}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => results.length > 0 && setOpen(true)}
          onKeyDown={onKeyDown}
          className="w-full bg-transparent text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none disabled:cursor-not-allowed"
        />
        {loading && <span className="h-3.5 w-3.5 shrink-0 animate-spin rounded-full border-2 border-slate-300 border-t-brand-500" />}
        {!loading && query && (
          <button
            type="button"
            aria-label="Clear location"
            onClick={() => {
              setQuery("");
              setResults([]);
            }}
            className="rounded-full p-0.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
          >
            <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
              <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
            </svg>
          </button>
        )}
      </div>

      {open && results.length > 0 && (
        <ul
          id={listId}
          role="listbox"
          className="animate-fade-up absolute z-30 mt-1 max-h-72 w-full overflow-auto rounded-xl border border-slate-200 bg-white py-1 shadow-lg"
        >
          {results.map((place, index) => (
            <li
              key={place.id}
              role="option"
              aria-selected={index === activeIndex}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => choose(place)}
              onMouseEnter={() => setActiveIndex(index)}
              className={`cursor-pointer px-3 py-2 text-sm ${index === activeIndex ? "bg-brand-50" : "hover:bg-slate-50"}`}
            >
              <div className="font-medium text-slate-900">{place.name}</div>
              {place.fullAddress && place.fullAddress !== place.name && (
                <div className="truncate text-xs text-slate-500">{place.fullAddress}</div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
