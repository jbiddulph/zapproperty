"use client";

import { useState } from "react";
import {
  availabilityLabel,
  epcClasses,
  furnishingLabel,
  humanize,
  listingTypeClasses,
  listingTypeLabel,
  occupancyTone,
  roomsSummary,
  toneClasses,
} from "@/lib/format";
import type { Property } from "@/lib/types";

interface PropertyCardProps {
  property: Property;
  selected: boolean;
  hovered: boolean;
  onSelect: () => void;
  onHover: (hovering: boolean) => void;
}

export function PropertyCard({ property, selected, hovered, onSelect, onHover }: PropertyCardProps) {
  const tone = occupancyTone(property.occupancyStatus);
  const rooms = roomsSummary(property);
  const listing = property.listing;
  const listingType = listing?.listingType ?? null;
  const availability = availabilityLabel(listing?.availableFrom);

  return (
    <li data-property-id={property.id}>
      <button
        type="button"
        onClick={onSelect}
        onMouseEnter={() => onHover(true)}
        onMouseLeave={() => onHover(false)}
        onFocus={() => onHover(true)}
        onBlur={() => onHover(false)}
        aria-pressed={selected}
        className={`group flex w-full gap-3 rounded-xl border p-3 text-left transition ${
          selected
            ? "border-brand-400 bg-brand-50/60 shadow-sm ring-2 ring-brand-100"
            : hovered
              ? "border-slate-300 bg-white shadow-sm"
              : "border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm"
        }`}
      >
        <PropertyThumb property={property} />

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <h3 className="truncate text-sm font-semibold text-slate-900">{property.name}</h3>
            <div className="flex shrink-0 items-center gap-1">
              {listingType && (
                <span
                  className={`rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset ${listingTypeClasses[listingType]}`}
                >
                  {listingTypeLabel(listingType)}
                </span>
              )}
              {property.occupancyStatus && (
                <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset ${toneClasses[tone]}`}>
                  {humanize(property.occupancyStatus)}
                </span>
              )}
            </div>
          </div>

          <p className="mt-0.5 truncate text-xs text-slate-500">{property.fullAddress || "No address on record"}</p>

          {listing?.priceLabel && (
            <p className="mt-1.5 text-sm font-semibold text-slate-900">
              {listing.priceLabel}
              {availability && <span className="ml-2 text-xs font-normal text-slate-500">{availability}</span>}
            </p>
          )}

          <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-600">
            {rooms && <span className="font-medium text-slate-800">{rooms}</span>}
            {property.propertyType && <span>{humanize(property.propertyType)}</span>}
            {property.furnishing && <span>{furnishingLabel(property.furnishing)}</span>}
            {property.tenure && <span>{humanize(property.tenure)}</span>}
            {listing?.epcRating && (
              <span
                className={`rounded px-1.5 py-px text-[10px] font-bold leading-4 ${epcClasses(listing.epcRating)}`}
                title={`EPC rating ${listing.epcRating}`}
              >
                EPC {listing.epcRating}
              </span>
            )}
            {property.reference && <span className="font-mono text-[11px] text-slate-400">{property.reference}</span>}
          </div>

          {property.agent && (
            <p className="mt-1.5 truncate text-[11px] text-slate-500" title={`Marketed by ${property.agent.name}`}>
              Marketed by <span className="font-medium text-slate-700">{property.agent.name}</span>
            </p>
          )}

          {!property.listed && (
            <p className="mt-1.5 inline-flex items-center gap-1 rounded bg-slate-100 px-1.5 py-0.5 text-[11px] text-slate-600">
              Not published to ZapProperty
            </p>
          )}

          {!property.coordinates && (
            <p className="mt-1.5 inline-flex items-center gap-1 text-[11px] text-amber-700">
              <svg className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
                <path
                  fillRule="evenodd"
                  d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z"
                  clipRule="evenodd"
                />
              </svg>
              Address could not be mapped
            </p>
          )}
        </div>
      </button>
    </li>
  );
}

function PropertyThumb({ property }: { property: Property }) {
  // ZapTask can list a photo whose file is no longer on its storage; fall
  // back to the placeholder rather than a broken-image icon.
  const [failed, setFailed] = useState(false);

  if (property.coverPhotoUrl && !failed) {
    return (
      // Photos stream through the same-origin proxy with unknown dimensions,
      // so a plain <img> is used rather than next/image.
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={property.coverPhotoUrl}
        alt=""
        loading="lazy"
        onError={() => setFailed(true)}
        className="h-16 w-20 shrink-0 rounded-lg bg-slate-100 object-cover"
      />
    );
  }

  return (
    <div className="flex h-16 w-20 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-400">
      <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} aria-hidden>
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M2.25 12l8.954-8.955a1.126 1.126 0 011.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75"
        />
      </svg>
    </div>
  );
}
