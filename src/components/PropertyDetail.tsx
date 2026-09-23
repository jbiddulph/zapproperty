"use client";

import { useCallback, useEffect, useState } from "react";
import {
  availabilityLabel,
  bedroomsLabel,
  councilTaxLabel,
  epcClasses,
  formatDate,
  formatMoney,
  furnishingLabel,
  humanize,
  isOverdue,
  listingTypeClasses,
  listingTypeLabel,
  occupancyTone,
  priorityClasses,
  statusClasses,
  toneClasses,
} from "@/lib/format";
import type { Property, PropertyDetail as PropertyDetailData, PropertyListing, PropertyTask } from "@/lib/types";

interface PropertyDetailProps {
  property: Property;
  demo: boolean;
  onClose: () => void;
  onLocate: () => void;
}

interface FetchState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

async function readJson<T>(response: Response): Promise<T> {
  const json = (await response.json().catch(() => null)) as (T & { error?: string }) | null;
  if (!response.ok) throw new Error(json?.error ?? `Request failed (${response.status})`);
  return json as T;
}

export function PropertyDetail({ property, demo, onClose, onLocate }: PropertyDetailProps) {
  // The parent remounts this component per property (via `key`), so the
  // initial "loading" state is the reset — no synchronous setState in effects.
  const [detail, setDetail] = useState<FetchState<PropertyDetailData>>({ data: null, loading: true, error: null });
  const [tasks, setTasks] = useState<FetchState<PropertyTask[]>>({ data: null, loading: true, error: null });
  const [activePhoto, setActivePhoto] = useState(0);

  const fetchTasks = useCallback(
    (id: number) =>
      fetch(`/api/properties/${id}/tasks`)
        .then((r) => readJson<{ tasks: PropertyTask[] }>(r))
        .then(({ tasks }) => setTasks({ data: tasks, loading: false, error: null }))
        .catch((error: Error) => setTasks({ data: null, loading: false, error: error.message })),
    [],
  );

  const retryTasks = useCallback(() => {
    setTasks((s) => ({ ...s, loading: true, error: null }));
    void fetchTasks(property.id);
  }, [fetchTasks, property.id]);

  useEffect(() => {
    let cancelled = false;

    fetch(`/api/properties/${property.id}`)
      .then((r) => readJson<PropertyDetailData>(r))
      .then((data) => !cancelled && setDetail({ data, loading: false, error: null }))
      .catch((error: Error) => !cancelled && setDetail({ data: null, loading: false, error: error.message }));

    void fetchTasks(property.id);

    return () => {
      cancelled = true;
    };
  }, [property.id, fetchTasks]);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const data = detail.data ?? property;
  // Photo records whose file is missing on ZapTask's storage 404 through the
  // proxy; drop them from the gallery once the browser reports the failure.
  const [brokenPhotoIds, setBrokenPhotoIds] = useState<number[]>([]);
  const photos = (detail.data?.photos ?? []).filter((photo) => !brokenPhotoIds.includes(photo.id));
  const markPhotoBroken = useCallback((id: number) => setBrokenPhotoIds((ids) => (ids.includes(id) ? ids : [...ids, id])), []);
  const tone = occupancyTone(data.occupancyStatus);
  const listing = data.listing;
  const listingType = listing?.listingType ?? null;

  return (
    <aside
      className="animate-fade-up flex h-full w-full flex-col bg-white shadow-2xl ring-1 ring-slate-200"
      aria-label={`${data.name} details`}
    >
      <header className="flex items-start gap-3 border-b border-slate-200 px-4 py-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="truncate text-base font-semibold text-slate-900">{data.name}</h2>
            {listingType && (
              <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset ${listingTypeClasses[listingType]}`}>
                {listingTypeLabel(listingType)}
              </span>
            )}
            {data.occupancyStatus && (
              <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset ${toneClasses[tone]}`}>
                {humanize(data.occupancyStatus)}
              </span>
            )}
          </div>
          <p className="mt-0.5 truncate text-xs text-slate-500">{data.fullAddress || "No address on record"}</p>
          {listing?.priceLabel && (
            <p className="mt-1 text-lg font-bold tracking-tight text-slate-900">
              {listing.priceLabel}
              {listing.depositAmount !== null && (
                <span className="ml-2 text-xs font-normal text-slate-500">Deposit {formatMoney(listing.depositAmount)}</span>
              )}
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close details"
          className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-900"
        >
          <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
            <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
          </svg>
        </button>
      </header>

      <div className="scrollbar-thin flex-1 overflow-y-auto">
        <PhotoGallery
          photos={photos}
          loading={detail.loading}
          active={activePhoto}
          onChange={setActivePhoto}
          onBroken={markPhotoBroken}
          fallbackCover={property.coverPhotoUrl}
          totalOnRecord={detail.data?.photos.length ?? 0}
        />

        <section className="px-4 py-4">
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={onLocate}
              disabled={!data.coordinates}
              className="inline-flex items-center gap-1.5 rounded-lg bg-brand-600 px-3 py-1.5 text-sm font-medium text-white shadow-sm hover:bg-brand-700 disabled:cursor-not-allowed disabled:bg-slate-300"
            >
              <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
                <path
                  fillRule="evenodd"
                  d="M9.69 18.933l.003.001C9.89 19.02 10 19 10 19s.11.02.308-.066l.002-.001.006-.003.018-.008a5.741 5.741 0 00.281-.14c.186-.096.446-.24.757-.433.62-.384 1.445-.966 2.274-1.765C15.302 14.988 17 12.493 17 9A7 7 0 103 9c0 3.492 1.698 5.988 3.355 7.584a13.731 13.731 0 002.273 1.765 11.842 11.842 0 00.976.544l.062.029.018.008.006.003zM10 11.25a2.25 2.25 0 100-4.5 2.25 2.25 0 000 4.5z"
                  clipRule="evenodd"
                />
              </svg>
              Show on map
            </button>
            <a
              href={data.zaptaskUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 rounded-lg bg-white px-3 py-1.5 text-sm font-medium text-slate-700 shadow-sm ring-1 ring-inset ring-slate-200 hover:bg-slate-50"
            >
              Open in ZapTask
              <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
                <path
                  fillRule="evenodd"
                  d="M4.25 5.5a.75.75 0 00-.75.75v8.5c0 .414.336.75.75.75h8.5a.75.75 0 00.75-.75v-4a.75.75 0 011.5 0v4A2.25 2.25 0 0112.75 17h-8.5A2.25 2.25 0 012 14.75v-8.5A2.25 2.25 0 014.25 4h5a.75.75 0 010 1.5h-5z"
                  clipRule="evenodd"
                />
                <path
                  fillRule="evenodd"
                  d="M6.194 12.753a.75.75 0 001.06.053L16.5 4.44v2.81a.75.75 0 001.5 0v-4.5a.75.75 0 00-.75-.75h-4.5a.75.75 0 000 1.5h2.553l-9.056 8.194a.75.75 0 00-.053 1.06z"
                  clipRule="evenodd"
                />
              </svg>
            </a>
            {data.coordinates && (
              <a
                href={`https://www.google.com/maps/dir/?api=1&destination=${data.coordinates[1]},${data.coordinates[0]}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 rounded-lg bg-white px-3 py-1.5 text-sm font-medium text-slate-700 shadow-sm ring-1 ring-inset ring-slate-200 hover:bg-slate-50"
              >
                Directions
              </a>
            )}
          </div>

          {!data.listed && (
            <p className="mt-4 rounded-lg bg-slate-100 px-3 py-2 text-xs text-slate-600">
              <span className="font-medium text-slate-700">Not published.</span> &ldquo;Show on ZapProperty&rdquo; is unticked
              for this site in ZapTask; it is only visible because unlisted sites are enabled.
            </p>
          )}

          {data.agent && (
            <div className="mt-4 flex items-center gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2">
              {data.agent.logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element -- agent logos live on arbitrary hosts
                <img src={data.agent.logoUrl} alt="" className="h-8 w-8 rounded object-contain" />
              ) : (
                <span className="flex h-8 w-8 items-center justify-center rounded bg-brand-50 text-sm font-semibold text-brand-700">
                  {data.agent.name.charAt(0).toUpperCase()}
                </span>
              )}
              <div className="min-w-0 leading-tight">
                <div className="text-[11px] uppercase tracking-wide text-slate-500">Marketed by</div>
                {data.agent.website ? (
                  <a
                    href={data.agent.website}
                    target="_blank"
                    rel="noreferrer"
                    className="truncate text-sm font-medium text-brand-700 hover:underline"
                  >
                    {data.agent.name}
                  </a>
                ) : (
                  <div className="truncate text-sm font-medium text-slate-800">{data.agent.name}</div>
                )}
              </div>
            </div>
          )}

          <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
            <Fact label="Property type" value={data.propertyType ? humanize(data.propertyType) : null} />
            <Fact label="Bedrooms" value={bedroomsLabel(data.bedrooms)} />
            <Fact label="Bathrooms" value={data.bathrooms !== null ? String(data.bathrooms) : null} />
            <Fact label="Reception rooms" value={data.receptions !== null ? String(data.receptions) : null} />
            <Fact label="Tenure" value={data.tenure ? humanize(data.tenure) : null} />
            <Fact label="Furnishing" value={furnishingLabel(data.furnishing)} />
            <Fact label="Site status" value={humanize(data.status)} />
            <Fact label="Reference" value={data.reference} mono />
            <Fact label="ZapTask site ID" value={`#${data.id}`} mono />
            <Fact label="Client" value={data.clientId ? `Client #${data.clientId}` : null} />
            <Fact label="Updated" value={formatDate(data.updatedAt)} />
          </dl>

          <div className="mt-4 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600">
            {data.coordinates ? (
              <>
                <span className="font-medium text-slate-700">Location:</span>{" "}
                {data.coordinates[1].toFixed(5)}, {data.coordinates[0].toFixed(5)}{" "}
                <span className="text-slate-400">
                  · {data.geocodeSource === "mapbox" ? "geocoded by Mapbox" : data.geocodeSource === "metadata" ? "from site metadata" : ""}
                </span>
              </>
            ) : (
              <>
                <span className="font-medium text-amber-700">Not mapped.</span> Add a fuller address to this site in
                ZapTask so it can be geocoded.
              </>
            )}
          </div>
        </section>

        {listing && <ListingSection listing={listing} />}

        <TasksSection
          propertyId={property.id}
          state={tasks}
          demo={demo}
          onCreated={(task) => setTasks((s) => ({ ...s, data: [task, ...(s.data ?? [])] }))}
          onRetry={retryTasks}
        />
      </div>
    </aside>
  );
}

function Fact({ label, value, mono = false }: { label: string; value: string | null | undefined; mono?: boolean }) {
  return (
    <div>
      <dt className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{label}</dt>
      <dd className={`mt-0.5 text-slate-900 ${mono ? "font-mono text-xs" : ""}`}>{value || <span className="text-slate-400">—</span>}</dd>
    </div>
  );
}

const DESCRIPTION_PREVIEW_CHARS = 420;

function ListingSection({ listing }: { listing: PropertyListing }) {
  const [expanded, setExpanded] = useState(false);
  const availability = availabilityLabel(listing.availableFrom);
  const keyInfo: { label: string; value: React.ReactNode }[] = [];

  if (listing.depositAmount !== null) keyInfo.push({ label: "Deposit", value: formatMoney(listing.depositAmount) });
  if (listing.availableFrom) {
    keyInfo.push({
      label: "Available",
      value: availability === "Available now" ? "Now" : `From ${formatDate(listing.availableFrom)}`,
    });
  }
  if (listing.councilTaxBand) keyInfo.push({ label: "Council tax band", value: councilTaxLabel(listing.councilTaxBand) });
  if (listing.epcRating) {
    keyInfo.push({
      label: "EPC rating",
      value: (
        <span className={`inline-block rounded px-1.5 py-px text-xs font-bold leading-5 ${epcClasses(listing.epcRating)}`}>
          {listing.epcRating}
        </span>
      ),
    });
  }
  if (listing.broadband) keyInfo.push({ label: "Broadband", value: listing.broadband });

  const description = listing.description ?? "";
  const long = description.length > DESCRIPTION_PREVIEW_CHARS;
  const shown = expanded || !long ? description : `${description.slice(0, DESCRIPTION_PREVIEW_CHARS).trimEnd()}…`;

  if (keyInfo.length === 0 && listing.keyFeatures.length === 0 && !description) return null;

  return (
    <section className="border-t border-slate-200 px-4 py-4">
      {keyInfo.length > 0 && (
        <>
          <h3 className="text-sm font-semibold text-slate-900">Key information</h3>
          <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
            {keyInfo.map((item) => (
              <div key={item.label}>
                <dt className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{item.label}</dt>
                <dd className="mt-0.5 text-slate-900">{item.value}</dd>
              </div>
            ))}
          </dl>
        </>
      )}

      {listing.keyFeatures.length > 0 && (
        <div className={keyInfo.length > 0 ? "mt-4" : ""}>
          <h3 className="text-sm font-semibold text-slate-900">Key features</h3>
          <ul className="mt-2 grid gap-1.5 text-sm text-slate-700 sm:grid-cols-2">
            {listing.keyFeatures.map((feature, index) => (
              <li key={`${index}-${feature}`} className="flex items-start gap-2">
                <svg className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
                  <path
                    fillRule="evenodd"
                    d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z"
                    clipRule="evenodd"
                  />
                </svg>
                <span>{feature}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {description && (
        <div className={keyInfo.length > 0 || listing.keyFeatures.length > 0 ? "mt-4" : ""}>
          <h3 className="text-sm font-semibold text-slate-900">Description</h3>
          <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-slate-700">{shown}</p>
          {long && (
            <button
              type="button"
              onClick={() => setExpanded((e) => !e)}
              className="mt-1.5 text-sm font-medium text-brand-700 hover:text-brand-800"
            >
              {expanded ? "Show less" : "Show full description"}
            </button>
          )}
        </div>
      )}
    </section>
  );
}

function PhotoGallery({
  photos,
  loading,
  active,
  onChange,
  onBroken,
  fallbackCover,
  totalOnRecord,
}: {
  photos: PropertyDetailData["photos"];
  loading: boolean;
  active: number;
  onChange: (index: number) => void;
  onBroken: (id: number) => void;
  fallbackCover: string | null;
  totalOnRecord: number;
}) {
  if (loading && photos.length === 0) {
    return <div className="aspect-[16/9] w-full animate-pulse bg-slate-100" />;
  }

  if (photos.length === 0) {
    // Every photo on record failed to load — the files are missing on
    // ZapTask's storage, so don't retry the cover either.
    const filesMissing = totalOnRecord > 0;
    if (fallbackCover && !filesMissing) {
      // eslint-disable-next-line @next/next/no-img-element
      return <img src={fallbackCover} alt="" className="aspect-[16/9] w-full bg-slate-100 object-cover" />;
    }
    return (
      <div className="flex aspect-[16/9] w-full items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200 text-slate-400">
        <div className="px-6 text-center">
          <svg className="mx-auto h-8 w-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} aria-hidden>
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M2.25 12l8.954-8.955a1.126 1.126 0 011.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75"
            />
          </svg>
          {filesMissing ? (
            <>
              <p className="mt-1 text-xs font-medium text-slate-500">Photos unavailable</p>
              <p className="mt-0.5 text-[11px] text-slate-400">
                ZapTask lists {totalOnRecord} {totalOnRecord === 1 ? "photo" : "photos"} but the files could not be loaded.
                Re-upload them in ZapTask.
              </p>
            </>
          ) : (
            <p className="mt-1 text-xs">No listing photos</p>
          )}
        </div>
      </div>
    );
  }

  const current = photos[Math.min(active, photos.length - 1)];

  return (
    <div>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={current.url}
        alt={current.caption ?? ""}
        onError={() => onBroken(current.id)}
        className="aspect-[16/9] w-full bg-slate-100 object-cover"
      />
      {(current.caption || photos.length > 1) && (
        <div className="flex items-center justify-between gap-3 px-4 pt-2 text-xs text-slate-500">
          <span className="truncate">{current.caption}</span>
          <span className="shrink-0">
            {Math.min(active, photos.length - 1) + 1} / {photos.length}
          </span>
        </div>
      )}
      {photos.length > 1 && (
        <div className="scrollbar-thin flex gap-2 overflow-x-auto px-4 pt-2">
          {photos.map((photo, index) => (
            <button
              key={photo.id}
              type="button"
              onClick={() => onChange(index)}
              aria-label={`Show photo ${index + 1}`}
              className={`h-12 w-16 shrink-0 overflow-hidden rounded-md ring-2 ${
                index === active ? "ring-brand-500" : "ring-transparent hover:ring-slate-300"
              }`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={photo.url}
                alt=""
                loading="lazy"
                onError={() => onBroken(photo.id)}
                className="h-full w-full bg-slate-100 object-cover"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function TasksSection({
  propertyId,
  state,
  demo,
  onCreated,
  onRetry,
}: {
  propertyId: number;
  state: FetchState<PropertyTask[]>;
  demo: boolean;
  onCreated: (task: PropertyTask) => void;
  onRetry: () => void;
}) {
  const [composing, setComposing] = useState(false);
  const open = (state.data ?? []).filter((t) => !t.completedAt && !["done", "completed", "cancelled"].includes(t.status));
  const closed = (state.data ?? []).filter((t) => !open.includes(t));

  return (
    <section className="border-t border-slate-200 px-4 py-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-900">
          Tasks{state.data ? <span className="ml-1.5 text-slate-400">{open.length} open</span> : null}
        </h3>
        <button
          type="button"
          onClick={() => setComposing((c) => !c)}
          className="text-sm font-medium text-brand-700 hover:text-brand-800"
        >
          {composing ? "Cancel" : "+ New task"}
        </button>
      </div>

      {composing && (
        <NewTaskForm
          propertyId={propertyId}
          onCreated={(task) => {
            onCreated(task);
            setComposing(false);
          }}
        />
      )}

      {demo && (
        <p className="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">
          Demo mode — tasks are kept in memory and not sent to ZapTask.
        </p>
      )}

      {state.loading && (
        <ul className="mt-3 space-y-2">
          {Array.from({ length: 2 }).map((_, i) => (
            <li key={i} className="h-12 animate-pulse rounded-lg bg-slate-100" />
          ))}
        </ul>
      )}

      {state.error && (
        <div className="mt-3 rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-800">
          {state.error}{" "}
          <button type="button" onClick={onRetry} className="font-medium underline">
            Retry
          </button>
          <p className="mt-1 text-rose-700/80">The API key needs the <code>tasks.read</code> permission to list tasks.</p>
        </div>
      )}

      {state.data && state.data.length === 0 && !composing && (
        <p className="mt-3 text-sm text-slate-500">No tasks linked to this site yet.</p>
      )}

      {open.length > 0 && (
        <ul className="mt-3 space-y-2">
          {open.map((task) => (
            <TaskRow key={task.id} task={task} />
          ))}
        </ul>
      )}

      {closed.length > 0 && (
        <details className="mt-3">
          <summary className="cursor-pointer text-xs font-medium text-slate-500 hover:text-slate-700">
            {closed.length} completed
          </summary>
          <ul className="mt-2 space-y-2">
            {closed.map((task) => (
              <TaskRow key={task.id} task={task} />
            ))}
          </ul>
        </details>
      )}
    </section>
  );
}

function TaskRow({ task }: { task: PropertyTask }) {
  const overdue = isOverdue(task.dueDate, task.completedAt);
  const done = Boolean(task.completedAt) || ["done", "completed"].includes(task.status);

  return (
    <li className="rounded-lg border border-slate-200 bg-white px-3 py-2">
      <div className="flex items-start gap-2">
        <span
          className={`mt-1 h-2 w-2 shrink-0 rounded-full ${done ? "bg-emerald-500" : overdue ? "bg-rose-500" : "bg-brand-500"}`}
          aria-hidden
        />
        <div className="min-w-0 flex-1">
          <p className={`text-sm ${done ? "text-slate-500 line-through" : "text-slate-900"}`}>{task.title}</p>
          <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[11px]">
            <span className={`rounded-full px-1.5 py-0.5 font-medium ring-1 ring-inset ${statusClasses(task.status)}`}>
              {humanize(task.status)}
            </span>
            <span className={`rounded-full px-1.5 py-0.5 font-medium ring-1 ring-inset ${priorityClasses(task.priority)}`}>
              {humanize(task.priority)}
            </span>
            {task.category && <span className="text-slate-500">{humanize(task.category)}</span>}
            {task.dueDate && (
              <span className={overdue ? "font-medium text-rose-600" : "text-slate-500"}>
                {overdue ? "Overdue · " : "Due "}
                {formatDate(task.dueDate)}
              </span>
            )}
            {task.assignedTo && <span className="text-slate-500">· {task.assignedTo}</span>}
          </div>
        </div>
      </div>
    </li>
  );
}

const CATEGORIES = ["compliance", "maintenance", "inspection", "lettings", "viewing", "general"];

function NewTaskForm({ propertyId, onCreated }: { propertyId: number; onCreated: (task: PropertyTask) => void }) {
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("compliance");
  const [priority, setPriority] = useState("normal");
  const [dueDate, setDueDate] = useState("");
  const [assignedTo, setAssignedTo] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const { task } = await readJson<{ task: PropertyTask }>(
        await fetch(`/api/properties/${propertyId}/tasks`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title,
            category,
            priority,
            due_date: dueDate || undefined,
            assigned_to: assignedTo || undefined,
          }),
        }),
      );
      onCreated(task);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  const field =
    "w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-sm shadow-sm focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100";

  return (
    <form onSubmit={submit} className="animate-fade-up mt-3 space-y-2 rounded-xl border border-brand-100 bg-brand-50/40 p-3">
      <input
        type="text"
        required
        minLength={2}
        maxLength={255}
        autoFocus
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="e.g. Book Gas Safety Certificate"
        aria-label="Task title"
        className={field}
      />
      <div className="grid grid-cols-2 gap-2">
        <select value={category} onChange={(e) => setCategory(e.target.value)} aria-label="Category" className={field}>
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {humanize(c)}
            </option>
          ))}
        </select>
        <select value={priority} onChange={(e) => setPriority(e.target.value)} aria-label="Priority" className={field}>
          <option value="low">Low</option>
          <option value="normal">Normal</option>
          <option value="high">High</option>
          <option value="urgent">Urgent</option>
        </select>
        <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} aria-label="Due date" className={field} />
        <input
          type="text"
          value={assignedTo}
          onChange={(e) => setAssignedTo(e.target.value)}
          placeholder="Assignee (optional)"
          aria-label="Assignee"
          className={field}
        />
      </div>
      {error && <p className="text-xs text-rose-700">{error}</p>}
      <div className="flex items-center justify-between">
        <p className="text-[11px] text-slate-500">Created in ZapTask via the Platform API.</p>
        <button
          type="submit"
          disabled={submitting || title.trim().length < 2}
          className="rounded-lg bg-brand-600 px-3 py-1.5 text-sm font-medium text-white shadow-sm hover:bg-brand-700 disabled:cursor-not-allowed disabled:bg-slate-300"
        >
          {submitting ? "Creating…" : "Create task"}
        </button>
      </div>
    </form>
  );
}
