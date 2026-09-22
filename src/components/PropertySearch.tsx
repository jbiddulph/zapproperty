"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { FilterBar } from "./FilterBar";
import { LocationSearch, zoomForFeatureType, type PlaceResult } from "./LocationSearch";
import { PropertyDetail } from "./PropertyDetail";
import { PropertyList } from "./PropertyList";
import { PropertyMap, type FocusRequest } from "./PropertyMap";
import { applyFilters, defaultFilters, sortProperties, type Bounds, type Filters, type SortKey } from "@/lib/filters";
import type { AppStatus, PropertiesResponse } from "@/lib/types";

interface PropertySearchProps {
  status: AppStatus;
  mapboxToken: string;
  geocodeCountry: string | null;
}

type MobileView = "list" | "map";

function readPropertyParam(): number | null {
  if (typeof window === "undefined") return null;
  const raw = new URLSearchParams(window.location.search).get("property");
  const id = raw ? Number.parseInt(raw, 10) : NaN;
  return Number.isInteger(id) && id > 0 ? id : null;
}

function writePropertyParam(id: number | null) {
  if (typeof window === "undefined") return;
  const url = new URL(window.location.href);
  if (id === null) url.searchParams.delete("property");
  else url.searchParams.set("property", String(id));
  window.history.replaceState(null, "", url);
}

export function PropertySearch({ status, mapboxToken, geocodeCountry }: PropertySearchProps) {
  const [data, setData] = useState<PropertiesResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [filters, setFilters] = useState<Filters>(defaultFilters);
  const [sort, setSort] = useState<SortKey>("name");
  const [bounds, setBounds] = useState<Bounds | null>(null);

  // Deep links (?property=ID) only affect output once data has loaded, so the
  // server/client initial render stays identical.
  const [selectedId, setSelectedId] = useState<number | null>(() => readPropertyParam());
  const [hoveredId, setHoveredId] = useState<number | null>(null);
  const [focus, setFocus] = useState<FocusRequest | null>(null);
  const [fitNonce, setFitNonce] = useState(0);
  const [mobileView, setMobileView] = useState<MobileView>("map");

  // State updates happen inside promise callbacks only, so this is safe to
  // call from the mount effect; callers wanting a spinner set `loading` first.
  const load = useCallback(
    (refresh = false) =>
      fetch(`/api/properties${refresh ? "?refresh=1" : ""}`)
        .then(async (response) => {
          const json = (await response.json().catch(() => null)) as (PropertiesResponse & { error?: string }) | null;
          if (!response.ok || !json) throw new Error(json?.error ?? `Request failed (${response.status})`);
          setData(json);
          setError(null);
        })
        .catch((err: Error) => setError(err.message))
        .finally(() => setLoading(false)),
    [],
  );

  const refresh = useCallback(() => {
    setLoading(true);
    void load(true);
  }, [load]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    writePropertyParam(selectedId);
  }, [selectedId]);

  const all = useMemo(() => data?.properties ?? [], [data]);

  // Markers ignore the "in view" toggle — the map filtering itself by its own
  // viewport would just hide edge markers while panning.
  const mapProperties = useMemo(
    () => applyFilters(all, { ...filters, inViewOnly: false, locatedOnly: true }, null),
    [all, filters],
  );
  const visible = useMemo(() => sortProperties(applyFilters(all, filters, bounds), sort), [all, filters, bounds, sort]);
  const selected = useMemo(() => all.find((p) => p.id === selectedId) ?? null, [all, selectedId]);

  const focusOn = useCallback((id: number) => {
    const property = all.find((p) => p.id === id);
    if (!property?.coordinates) return;
    setFocus({ center: property.coordinates, zoom: 15, nonce: Date.now() });
  }, [all]);

  const selectFromList = useCallback(
    (id: number) => {
      setSelectedId(id);
      focusOn(id);
      setMobileView("map");
    },
    [focusOn],
  );

  const selectFromMap = useCallback((id: number) => setSelectedId(id), []);
  const closeDetail = useCallback(() => setSelectedId(null), []);

  const onPlaceSelected = useCallback((place: PlaceResult) => {
    setFocus({
      center: place.center,
      zoom: zoomForFeatureType(place.featureType),
      bounds: place.bounds ?? undefined,
      nonce: Date.now(),
    });
    setFilters((f) => ({ ...f, inViewOnly: true }));
    setMobileView("map");
  }, []);

  const proximity = useMemo(() => {
    if (!bounds) return null;
    const [[w, s], [e, n]] = bounds;
    return [(w + e) / 2, (s + n) / 2] as [number, number];
  }, [bounds]);

  return (
    <div className="flex h-full flex-col">
      <header className="z-20 flex items-center gap-3 border-b border-slate-200 bg-white px-4 py-2.5 shadow-sm">
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600 text-white shadow-sm">
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
              <path d="M13 2L4.5 13.5H11L10 22l8.5-11.5H12L13 2z" />
            </svg>
          </span>
          <div className="leading-tight">
            <div className="text-sm font-bold tracking-tight text-slate-900">ZapProperty</div>
            <div className="hidden text-[11px] text-slate-500 sm:block">Property search on ZapTask</div>
          </div>
        </div>

        <div className="mx-auto w-full max-w-xl">
          <LocationSearch token={mapboxToken} country={geocodeCountry} proximity={proximity} onSelect={onPlaceSelected} />
        </div>

        <div className="ml-auto flex items-center gap-2">
          <StatusPill status={status} source={data?.meta.source ?? null} />
          <button
            type="button"
            onClick={refresh}
            disabled={loading}
            aria-label="Refresh from ZapTask"
            title="Refresh from ZapTask"
            className="rounded-lg border border-slate-200 bg-white p-2 text-slate-600 shadow-sm hover:bg-slate-50 disabled:opacity-50"
          >
            <svg className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} viewBox="0 0 20 20" fill="currentColor" aria-hidden>
              <path
                fillRule="evenodd"
                d="M15.312 11.424a5.5 5.5 0 01-9.201 2.466l-.312-.311h2.433a.75.75 0 000-1.5H3.989a.75.75 0 00-.75.75v4.242a.75.75 0 001.5 0v-2.43l.31.31a7 7 0 0011.712-3.138.75.75 0 00-1.449-.39zm1.23-3.723a.75.75 0 00.219-.53V2.929a.75.75 0 00-1.5 0V5.36l-.31-.31A7 7 0 003.239 8.188a.75.75 0 101.448.389A5.5 5.5 0 0113.89 6.11l.311.31h-2.432a.75.75 0 000 1.5h4.243a.75.75 0 00.53-.219z"
                clipRule="evenodd"
              />
            </svg>
          </button>
        </div>
      </header>

      <div className="relative flex min-h-0 flex-1">
        <aside
          className={`${
            mobileView === "list" ? "flex" : "hidden"
          } w-full flex-col border-r border-slate-200 bg-slate-50 md:flex md:w-[400px] lg:w-[440px] xl:w-[480px]`}
        >
          <div className="border-b border-slate-200 bg-white px-4 py-3">
            <FilterBar
              filters={filters}
              facets={data?.meta.facets ?? null}
              sort={sort}
              onChange={setFilters}
              onSortChange={setSort}
              unlocatedCount={data?.meta.unlocated ?? 0}
            />
          </div>

          <div className="flex items-center justify-between px-4 py-2 text-xs text-slate-500">
            <span>
              {loading ? "Loading…" : (
                <>
                  <span className="font-semibold text-slate-800">{visible.length}</span> of {all.length}{" "}
                  {all.length === 1 ? "property" : "properties"}
                  {data?.meta.unlocated ? (
                    <span className="text-amber-700"> · {data.meta.unlocated} unmapped</span>
                  ) : null}
                </>
              )}
            </span>
            <button
              type="button"
              onClick={() => {
                setFitNonce((n) => n + 1);
                setMobileView("map");
              }}
              disabled={mapProperties.length === 0}
              className="font-medium text-brand-700 hover:text-brand-800 disabled:text-slate-400"
            >
              Fit map to results
            </button>
          </div>

          <div className="scrollbar-thin flex-1 overflow-y-auto px-4 pb-24 md:pb-4">
            <PropertyList
              properties={visible}
              total={all.length}
              loading={loading && !data}
              error={error}
              selectedId={selectedId}
              hoveredId={hoveredId}
              onSelect={selectFromList}
              onHover={setHoveredId}
              onRetry={refresh}
            />
          </div>
        </aside>

        <main className={`${mobileView === "map" ? "block" : "hidden"} relative min-w-0 flex-1 md:block`}>
          {mapboxToken ? (
            <PropertyMap
              token={mapboxToken}
              properties={mapProperties}
              selectedId={selectedId}
              hoveredId={hoveredId}
              focus={focus}
              fitNonce={fitNonce}
              onSelect={selectFromMap}
              onHover={setHoveredId}
              onBoundsChange={setBounds}
            />
          ) : (
            <MapboxMissing />
          )}

          {selected && (
            <div className="absolute inset-0 z-10 md:inset-y-3 md:left-auto md:right-3 md:w-[400px] lg:w-[420px]">
              <div className="h-full overflow-hidden md:rounded-2xl">
                <PropertyDetail
                  key={selected.id}
                  property={selected}
                  demo={status.demo}
                  onClose={closeDetail}
                  onLocate={() => focusOn(selected.id)}
                />
              </div>
            </div>
          )}
        </main>

        <MobileToggle view={mobileView} onChange={setMobileView} count={visible.length} hidden={Boolean(selected)} />
      </div>
    </div>
  );
}

function StatusPill({ status, source }: { status: AppStatus; source: "zaptask" | "demo" | null }) {
  const demo = status.demo || source === "demo";
  const host = status.zaptaskBaseUrl.replace(/^https?:\/\//, "");

  return (
    <span
      title={
        demo
          ? "Running with sample data. Set ZAPTASK_API_KEY to connect to your ZapTask company."
          : `Connected to ${host} via the Platform API`
      }
      className={`hidden items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset sm:inline-flex ${
        demo ? "bg-amber-50 text-amber-800 ring-amber-600/20" : "bg-emerald-50 text-emerald-700 ring-emerald-600/20"
      }`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${demo ? "bg-amber-500" : "bg-emerald-500"}`} />
      {demo ? "Demo data" : host}
    </span>
  );
}

function MobileToggle({
  view,
  onChange,
  count,
  hidden,
}: {
  view: MobileView;
  onChange: (view: MobileView) => void;
  count: number;
  hidden: boolean;
}) {
  if (hidden) return null;
  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-5 z-20 flex justify-center md:hidden">
      <div className="pointer-events-auto inline-flex rounded-full bg-slate-900 p-1 text-sm font-medium text-white shadow-lg">
        <button
          type="button"
          onClick={() => onChange("list")}
          className={`rounded-full px-4 py-1.5 ${view === "list" ? "bg-white text-slate-900" : ""}`}
        >
          List ({count})
        </button>
        <button
          type="button"
          onClick={() => onChange("map")}
          className={`rounded-full px-4 py-1.5 ${view === "map" ? "bg-white text-slate-900" : ""}`}
        >
          Map
        </button>
      </div>
    </div>
  );
}

function MapboxMissing() {
  return (
    <div className="flex h-full items-center justify-center bg-[radial-gradient(circle_at_1px_1px,rgb(203_213_225)_1px,transparent_0)] bg-[size:24px_24px] p-6">
      <div className="max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-lg">
        <h2 className="text-base font-semibold text-slate-900">Add a Mapbox token to show the map</h2>
        <p className="mt-2 text-sm text-slate-600">
          Create a public token at{" "}
          <a className="text-brand-700 underline" href="https://account.mapbox.com/access-tokens/" target="_blank" rel="noreferrer">
            account.mapbox.com
          </a>{" "}
          and set it in <code className="rounded bg-slate-100 px-1 py-0.5 text-xs">.env</code>:
        </p>
        <pre className="mt-3 overflow-x-auto rounded-lg bg-slate-900 px-3 py-2 text-xs text-slate-100">
          NEXT_PUBLIC_MAPBOX_TOKEN=pk.your_token_here
        </pre>
        <p className="mt-3 text-xs text-slate-500">
          The property list and filters on the left work without it; only the map and place search need Mapbox.
        </p>
      </div>
    </div>
  );
}
