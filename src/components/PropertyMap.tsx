"use client";

import mapboxgl from "mapbox-gl";
import { useEffect, useRef, useState } from "react";
import type { Bounds } from "@/lib/filters";
import { escapeHtml, humanize, occupancyTone, roomsSummary, toneHex } from "@/lib/format";
import type { LngLat, Property } from "@/lib/types";

export interface FocusRequest {
  center: LngLat;
  zoom?: number;
  bounds?: Bounds;
  nonce: number;
}

interface PropertyMapProps {
  token: string;
  properties: Property[];
  selectedId: number | null;
  hoveredId: number | null;
  focus: FocusRequest | null;
  fitNonce: number;
  onSelect: (id: number) => void;
  onHover: (id: number | null) => void;
  onBoundsChange: (bounds: Bounds) => void;
}

interface PointProps {
  id: number;
  name: string;
  subtitle: string;
  meta: string;
  color: string;
}

const SOURCE = "properties";
const DEFAULT_CENTER: LngLat = [-1.5, 52.8];
const DEFAULT_ZOOM = 5.4;

function toGeoJSON(properties: Property[]): GeoJSON.FeatureCollection<GeoJSON.Point, PointProps> {
  return {
    type: "FeatureCollection",
    features: properties
      .filter((p): p is Property & { coordinates: LngLat } => Boolean(p.coordinates))
      .map((p) => ({
        type: "Feature",
        id: p.id,
        geometry: { type: "Point", coordinates: p.coordinates },
        properties: {
          id: p.id,
          name: p.name,
          subtitle: p.fullAddress || p.reference || "",
          meta: [
            p.listing?.priceLabel ?? null,
            roomsSummary(p),
            p.propertyType ? humanize(p.propertyType) : null,
            p.occupancyStatus ? humanize(p.occupancyStatus) : null,
          ]
            .filter(Boolean)
            .join(" · "),
          color: toneHex[occupancyTone(p.occupancyStatus)],
        },
      })),
  };
}

function boundsOf(properties: Property[]): mapboxgl.LngLatBounds | null {
  let bounds: mapboxgl.LngLatBounds | null = null;
  for (const p of properties) {
    if (!p.coordinates) continue;
    bounds = bounds ? bounds.extend(p.coordinates) : new mapboxgl.LngLatBounds(p.coordinates, p.coordinates);
  }
  return bounds;
}

function toBounds(map: mapboxgl.Map): Bounds {
  const b = map.getBounds();
  if (!b) return [[-180, -90], [180, 90]];
  return [
    [b.getWest(), b.getSouth()],
    [b.getEast(), b.getNorth()],
  ];
}

export function PropertyMap({
  token,
  properties,
  selectedId,
  hoveredId,
  focus,
  fitNonce,
  onSelect,
  onHover,
  onBoundsChange,
}: PropertyMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const popupRef = useRef<mapboxgl.Popup | null>(null);
  const hasFitRef = useRef(false);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Keep latest callbacks without re-binding map listeners.
  const callbacks = useRef({ onSelect, onHover, onBoundsChange });
  useEffect(() => {
    callbacks.current = { onSelect, onHover, onBoundsChange };
  }, [onSelect, onHover, onBoundsChange]);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    mapboxgl.accessToken = token;
    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: "mapbox://styles/mapbox/light-v11",
      center: DEFAULT_CENTER,
      zoom: DEFAULT_ZOOM,
      attributionControl: true,
      cooperativeGestures: false,
    });
    mapRef.current = map;

    map.addControl(new mapboxgl.NavigationControl({ visualizePitch: false }), "top-right");
    map.addControl(new mapboxgl.GeolocateControl({ positionOptions: { enableHighAccuracy: true } }), "top-right");
    map.addControl(new mapboxgl.ScaleControl({ unit: "metric" }), "bottom-left");

    map.on("error", (event) => {
      const status = (event.error as { status?: number } | undefined)?.status;
      if (status === 401 || status === 403) {
        setError("Mapbox rejected the access token. Check NEXT_PUBLIC_MAPBOX_TOKEN.");
      }
    });

    map.on("load", () => {
      map.addSource(SOURCE, {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] },
        cluster: true,
        clusterMaxZoom: 13,
        clusterRadius: 48,
        promoteId: "id",
      });

      map.addLayer({
        id: "clusters",
        type: "circle",
        source: SOURCE,
        filter: ["has", "point_count"],
        paint: {
          "circle-color": "#1b56f5",
          "circle-opacity": 0.9,
          "circle-radius": ["step", ["get", "point_count"], 18, 10, 24, 50, 30],
          "circle-stroke-width": 4,
          "circle-stroke-color": "rgba(27, 86, 245, 0.25)",
        },
      });

      map.addLayer({
        id: "cluster-count",
        type: "symbol",
        source: SOURCE,
        filter: ["has", "point_count"],
        layout: {
          "text-field": ["get", "point_count_abbreviated"],
          "text-font": ["DIN Pro Bold", "Arial Unicode MS Bold"],
          "text-size": 13,
        },
        paint: { "text-color": "#ffffff" },
      });

      map.addLayer({
        id: "point-hover",
        type: "circle",
        source: SOURCE,
        filter: ["==", ["get", "id"], -1],
        paint: {
          "circle-radius": 15,
          "circle-color": "#1b56f5",
          "circle-opacity": 0.18,
        },
      });

      map.addLayer({
        id: "point-selected",
        type: "circle",
        source: SOURCE,
        filter: ["==", ["get", "id"], -1],
        paint: {
          "circle-radius": 13,
          "circle-color": "transparent",
          "circle-stroke-width": 3,
          "circle-stroke-color": "#1b56f5",
        },
      });

      map.addLayer({
        id: "points",
        type: "circle",
        source: SOURCE,
        filter: ["!", ["has", "point_count"]],
        paint: {
          "circle-color": ["get", "color"],
          "circle-radius": ["interpolate", ["linear"], ["zoom"], 6, 5, 12, 8, 16, 10],
          "circle-stroke-width": 2,
          "circle-stroke-color": "#ffffff",
        },
      });

      map.on("click", "clusters", (event) => {
        const feature = event.features?.[0];
        const clusterId = feature?.properties?.cluster_id as number | undefined;
        const source = map.getSource(SOURCE) as mapboxgl.GeoJSONSource | undefined;
        if (!feature || clusterId === undefined || !source) return;
        source.getClusterExpansionZoom(clusterId, (err, zoom) => {
          if (err || zoom === null || zoom === undefined) return;
          const [lng, lat] = (feature.geometry as GeoJSON.Point).coordinates;
          map.easeTo({ center: [lng, lat], zoom: zoom + 0.5 });
        });
      });

      map.on("click", "points", (event) => {
        const id = event.features?.[0]?.properties?.id as number | undefined;
        if (id !== undefined) callbacks.current.onSelect(Number(id));
      });

      map.on("mouseenter", "clusters", () => {
        map.getCanvas().style.cursor = "pointer";
      });
      map.on("mouseleave", "clusters", () => {
        map.getCanvas().style.cursor = "";
      });

      map.on("mouseenter", "points", (event) => {
        map.getCanvas().style.cursor = "pointer";
        const feature = event.features?.[0];
        if (!feature) return;
        const props = feature.properties as unknown as PointProps;
        const [lng, lat] = (feature.geometry as GeoJSON.Point).coordinates;
        callbacks.current.onHover(Number(props.id));

        popupRef.current?.remove();
        popupRef.current = new mapboxgl.Popup({ closeButton: false, offset: 14, maxWidth: "260px" })
          .setLngLat([lng, lat])
          .setHTML(
            `<div class="px-3 py-2">
               <div class="text-sm font-semibold text-slate-900">${escapeHtml(props.name)}</div>
               ${props.subtitle ? `<div class="mt-0.5 text-xs text-slate-500">${escapeHtml(props.subtitle)}</div>` : ""}
               ${props.meta ? `<div class="mt-1 text-xs font-medium" style="color:${props.color}">${escapeHtml(props.meta)}</div>` : ""}
             </div>`,
          )
          .addTo(map);
      });

      map.on("mouseleave", "points", () => {
        map.getCanvas().style.cursor = "";
        callbacks.current.onHover(null);
        popupRef.current?.remove();
        popupRef.current = null;
      });

      map.on("moveend", () => callbacks.current.onBoundsChange(toBounds(map)));
      callbacks.current.onBoundsChange(toBounds(map));

      setLoaded(true);
    });

    return () => {
      popupRef.current?.remove();
      map.remove();
      mapRef.current = null;
      setLoaded(false);
      hasFitRef.current = false;
    };
  }, [token]);

  // Push data into the source whenever the located property set changes.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !loaded) return;
    const source = map.getSource(SOURCE) as mapboxgl.GeoJSONSource | undefined;
    if (!source) return;
    source.setData(toGeoJSON(properties));

    if (!hasFitRef.current) {
      const bounds = boundsOf(properties);
      if (bounds) {
        hasFitRef.current = true;
        map.fitBounds(bounds, { padding: 64, maxZoom: 14, duration: 600 });
      }
    }
  }, [properties, loaded]);

  // Explicit "fit to results" requests from the toolbar.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !loaded || fitNonce === 0) return;
    const bounds = boundsOf(properties);
    if (bounds) map.fitBounds(bounds, { padding: 64, maxZoom: 15, duration: 700 });
    // Only re-run when a new fit is requested, not when data changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fitNonce, loaded]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !loaded) return;
    map.setFilter("point-selected", ["==", ["get", "id"], selectedId ?? -1]);
  }, [selectedId, loaded]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !loaded) return;
    map.setFilter("point-hover", ["==", ["get", "id"], hoveredId ?? -1]);
  }, [hoveredId, loaded]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !loaded || !focus) return;
    if (focus.bounds) {
      map.fitBounds(focus.bounds, { padding: 48, duration: 900, maxZoom: 16 });
    } else {
      map.flyTo({ center: focus.center, zoom: focus.zoom ?? 15, duration: 900, essential: true });
    }
  }, [focus, loaded]);

  return (
    <div className="relative h-full w-full">
      <div ref={containerRef} className="h-full w-full" aria-label="Property map" role="region" />
      {!loaded && !error && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-slate-100/60">
          <div className="flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm text-slate-600 shadow">
            <span className="h-2 w-2 animate-pulse rounded-full bg-brand-500" />
            Loading map…
          </div>
        </div>
      )}
      {error && (
        <div className="absolute inset-x-4 top-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800 shadow">
          {error}
        </div>
      )}
      <MapLegend />
    </div>
  );
}

function MapLegend() {
  const items: Array<[string, string]> = [
    ["Occupied", toneHex.emerald],
    ["Vacant", toneHex.amber],
    ["Notice / arrears", toneHex.rose],
    ["Other", toneHex.slate],
  ];
  return (
    <div className="pointer-events-none absolute bottom-8 right-3 hidden rounded-xl border border-slate-200 bg-white/95 px-3 py-2 text-xs shadow-sm backdrop-blur sm:block">
      <div className="mb-1 font-semibold text-slate-700">Occupancy</div>
      <ul className="space-y-1">
        {items.map(([label, color]) => (
          <li key={label} className="flex items-center gap-2 text-slate-600">
            <span className="inline-block h-2.5 w-2.5 rounded-full ring-2 ring-white" style={{ backgroundColor: color }} />
            {label}
          </li>
        ))}
      </ul>
    </div>
  );
}
