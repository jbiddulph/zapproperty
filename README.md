# ZapProperty

Property search for **ZapTask** — an interactive Mapbox map over the property sites your company manages in ZapTask, powered by the [ZapTask Platform API](https://app.zaptask.co.uk) (`/api/v1`).

ZapProperty is an *app on ZapTask*: it never stores properties or tasks itself. Sites are read from `/api/v1/assets`, and any task you create from a property lands straight in ZapTask for the whole team.

## Features

- **Map search** — clustered Mapbox markers for every property site, coloured by occupancy (occupied / vacant / notice served). Hover for a summary, click for details.
- **Place search** — jump to a town, postcode or address with Mapbox Geocoding autocomplete, then restrict results to the visible map area ("Only in map view").
- **Filters** — free-text search over name/reference/address, property type, minimum bedrooms, tenure, occupancy, site status, and sort order.
- **Property detail** — listing photo gallery, property facts, coordinates, deep link back to the site in ZapTask, and directions.
- **Tasks on a property** — see the open and completed tasks linked to a site and create new ones (compliance, maintenance, viewings…) via the Platform API.
- **Automatic geocoding** — ZapTask stores postal addresses; ZapProperty geocodes them server-side with Mapbox and caches the result. Optionally writes the coordinates back to the site's `metadata.geo` so they never need geocoding again.
- **Demo mode** — runs with sample Sussex/London properties when no API key is configured, so you can try the UI first.
- **Key stays server-side** — the `zt_live_*` key is only used in Next.js route handlers. Listing photos (which require the key) are streamed through a same-origin proxy.

## Quick start

```bash
git clone git@github.com:jbiddulph/zapproperty.git
cd zapproperty
npm install
cp .env.example .env
```

Fill in `.env`:

| Variable | Required | Notes |
|---|---|---|
| `NEXT_PUBLIC_MAPBOX_TOKEN` | yes | Public token (`pk.…`) from [account.mapbox.com](https://account.mapbox.com/access-tokens/). Used in the browser for the map and place search. |
| `ZAPTASK_API_KEY` | for live data | `zt_live_…` key from ZapTask → **Settings → Platform → Platform API keys**. Needs `assets.read`; add `tasks.read` / `tasks.write` for the task panel. |
| `ZAPTASK_BASE_URL` | no | Defaults to `https://app.zaptask.co.uk`. Point at a local ZapTask for development. |
| `ZAPTASK_ASSET_TYPE` | no | `property` (default) or `all` to include every site type. |
| `ZAPTASK_MAX_ASSETS` | no | Cap on sites pulled per load (default 1000). |
| `ZAPTASK_DEMO` | no | `true` forces sample data even when a key is set. |
| `MAPBOX_SERVER_TOKEN` | no | Separate token for server-side geocoding; falls back to the public token. |
| `GEOCODE_COUNTRY` | no | Bias geocoding to a country code, e.g. `gb`. |
| `ZAPTASK_WRITE_BACK_GEOCODE` | no | `true` to persist geocoded coordinates to `metadata.geo` on each site (needs `assets.write`). |

Then:

```bash
npm run dev
# open http://localhost:3000
```

Without `ZAPTASK_API_KEY` the app runs in **demo mode** with sample properties. Without `NEXT_PUBLIC_MAPBOX_TOKEN` the list and filters still work; the map panel explains how to add a token.

## How it fits ZapTask

```
Company → Clients → Compliance → Sites → Projects → Tasks
                                   ▲                  ▲
                          ZapProperty reads        ZapProperty creates
                          /api/v1/assets           /api/v1/tasks (asset_id)
```

| ZapTask endpoint | Used for |
|---|---|
| `GET /api/v1/assets?type=property` | Property list (paginated, up to `ZAPTASK_MAX_ASSETS`) |
| `GET /api/v1/assets/{id}` | Detail drawer incl. photo gallery |
| `GET /api/v1/assets/{id}/photos/{photoId}` | Photo bytes, proxied with the bearer token |
| `PATCH /api/v1/assets/{id}` | Optional geocode write-back to `metadata.geo` |
| `GET /api/v1/tasks?asset_id={id}` | Tasks for a property |
| `POST /api/v1/tasks` | "New task" form (`source: zapproperty`) |

Coordinates are resolved in this order: `metadata.geo` / `metadata.latitude+longitude` on the site → Mapbox Geocoding of the postal address → unmapped (still listed, flagged in the UI).

## Project layout

```
src/
  app/
    page.tsx                         Server component: reads config, renders the app
    api/properties/route.ts          GET list (ZapTask → geocode → GeoJSON-ready)
    api/properties/[id]/route.ts     GET detail with photos
    api/properties/[id]/photos/[photoId]/route.ts   Photo proxy
    api/properties/[id]/tasks/route.ts              GET tasks / POST create task
  components/
    PropertySearch.tsx               State container: filters, selection, map focus
    PropertyMap.tsx                  Mapbox GL map, clustering, popups, highlight layers
    LocationSearch.tsx               Mapbox Geocoding autocomplete
    FilterBar.tsx / PropertyList.tsx / PropertyCard.tsx / PropertyDetail.tsx
  lib/
    zaptask.ts                       Typed Platform API client (mirrors @zaptask/sdk)
    geocode.ts                       Mapbox Geocoding v6 with cache + concurrency limit
    properties.ts                    Loader/transform layer, demo fallback, write-back
    filters.ts / format.ts / types.ts / config.ts / demo-data.ts
```

## Scripts

```bash
npm run dev        # start dev server
npm run build      # production build
npm start          # run production build
npm run lint       # eslint
npm run typecheck  # tsc --noEmit
```

## Deploying

Any Node host works; on Vercel, import the repo and add the environment variables above. `ZAPTASK_API_KEY` and `MAPBOX_SERVER_TOKEN` should be server-only secrets; `NEXT_PUBLIC_MAPBOX_TOKEN` is public by design — restrict it to your domain in the Mapbox dashboard.
