# ZapProperty

Property search for **ZapTask** — an interactive Mapbox map over every property that estate agents on ZapTask have published with **Show on ZapProperty**, powered by the [ZapTask Platform API](https://app.zaptask.co.uk) (`/api/v1`).

ZapProperty is an *app on ZapTask*: it never stores properties or tasks itself. Listings are read from the ZapTask portal API with one platform key, so agents from every company on ZapTask appear side by side, and any task you create from a property lands in that agent's ZapTask for their team.

## Features

- **Every agent, one key** — the ZapProperty portal key (`zp_live_…`) reads published listings across *all* companies on ZapTask. Each listing carries the agent marketing it ("Marketed by …"), with an Agent filter when more than one is present.
- **Published listings only** — a site appears when the agent ticks **Show on ZapProperty** on it in ZapTask, whatever its asset type (property, building, unit, site). Untick it and the site disappears on the next refresh.
- **Map search** — clustered Mapbox markers for every published site, coloured by occupancy (occupied / vacant / notice served). Hover for price and summary, click for details.
- **Place search** — jump to a town, postcode or address with Mapbox Geocoding autocomplete, then restrict results to the visible map area ("Only in map view").
- **Listing details** — everything an estate agent enters on the site in ZapTask: to rent / for sale, price (pcm, pw, pa, guide, offers over, POA…), bedrooms, bathrooms, reception rooms, furnishing, deposit, available-from date, council tax band, EPC rating, broadband, key features and description. Sections the agent hides with the per-field visibility toggles are stripped server-side and never reach the browser.
- **Filters** — To rent / For sale, price range (rentals compared as monthly equivalents, so pw and pa listings sort correctly), property type, bedrooms, bathrooms, furnishing, tenure, occupancy, site status; free-text search also matches key features and EPC. Sort by name, recency, price or availability.
- **Property detail** — photo gallery, headline price and deposit, property facts, key information, key features, description, coordinates, deep link back to the site in ZapTask, and directions.
- **Tasks on a property** — see the open and completed tasks linked to a site and create new ones (compliance, maintenance, viewings…) via the Platform API.
- **Automatic geocoding** — ZapTask stores postal addresses; ZapProperty geocodes them server-side with Mapbox and caches the result. Optionally writes the coordinates back to the site's `metadata.geo` so they never need geocoding again.
- **Demo mode** — runs with sample Sussex/London properties when no API key is configured, so you can try the UI first.
- **Key stays server-side** — the ZapTask key is only used in Next.js route handlers. Listing photos (which require the key) are streamed through a same-origin proxy.

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
| `ZAPTASK_API_KEY` | for live data | **Portal key** `zp_live_…` — generated on the ZapTask server with `php artisan zapproperty:key` and set there as `ZAPPROPERTY_API_KEY`; returns published listings from every company. Or a **company key** `zt_live_…` (ZapTask → **Settings → Platform → Platform API keys**, needs `assets.read` + `tasks.*`), which sees one company only. |
| `ZAPTASK_API_SCOPE` | no | `platform` or `company`. Normally inferred from the key prefix. |
| `ZAPTASK_BASE_URL` | no | Defaults to `https://app.zaptask.co.uk`. Point at a local ZapTask for development. |
| `ZAPTASK_INCLUDE_UNLISTED` | no | Company keys only: `true` to also show sites whose **Show on ZapProperty** box is unticked (labelled "Not published"). |
| `ZAPTASK_ASSET_TYPE` | no | Optional extra restriction to one asset type, e.g. `property`. Blank (default) accepts any type the agent has published. |
| `ZAPTASK_MAX_ASSETS` | no | Cap on sites pulled per load (default 1000). |
| `ZAPTASK_DEMO` | no | `true` forces sample data even when a key is set. |
| `MAPBOX_SERVER_TOKEN` | no | Separate token for server-side geocoding; falls back to the public token. |
| `GEOCODE_COUNTRY` | no | Bias geocoding to a country code, e.g. `gb`. |
| `ZAPTASK_WRITE_BACK_GEOCODE` | no | Company keys only: `true` to persist geocoded coordinates to `metadata.geo` on each site (needs `assets.write`). |

Then:

```bash
npm run dev
# open http://localhost:3000
```

Without `ZAPTASK_API_KEY` the app runs in **demo mode** with sample properties. Without `NEXT_PUBLIC_MAPBOX_TOKEN` the list and filters still work; the map panel explains how to add a token.

## How it fits ZapTask

```
Company A ─ Sites ──┐
Company B ─ Sites ──┼─▶  /api/v1/zapproperty/listings  ─▶  ZapProperty
Company C ─ Sites ──┘    (show_on_zapproperty = true)         │
                                                              ▼
                              /api/v1/zapproperty/listings/{id}/tasks
                              (task lands in that listing's company)
```

### Portal key (`zp_live_…`, recommended)

| ZapTask endpoint | Used for |
|---|---|
| `GET /api/v1/zapproperty/listings` | Every published listing across all companies (paginated, up to `ZAPTASK_MAX_ASSETS`); includes `agent` and `meta.unpublished_total` |
| `GET /api/v1/zapproperty/listings/{id}` | Detail drawer incl. photo gallery; 404 unless published |
| `GET /api/v1/zapproperty/listings/{id}/photos/{photoId}` | Photo bytes, proxied with the bearer token |
| `GET /api/v1/zapproperty/listings/{id}/tasks` | Tasks for a property |
| `POST /api/v1/zapproperty/listings/{id}/tasks` | "New task" form (`source: zapproperty`), created in the listing's company |

To enable it on ZapTask: `php artisan zapproperty:key`, then `heroku config:set ZAPPROPERTY_API_KEY=<key>` (or the equivalent for your host) and set the same value as `ZAPTASK_API_KEY` here.

### Company key (`zt_live_…`)

| ZapTask endpoint | Used for |
|---|---|
| `GET /api/v1/assets` | That company's sites, then filtered here to `property.listing.show_on_zapproperty === true` — the company API has no server-side filter for it |
| `GET /api/v1/assets/{id}` | Detail drawer incl. photo gallery |
| `GET /api/v1/assets/{id}/photos/{photoId}` | Photo bytes, proxied with the bearer token |
| `PATCH /api/v1/assets/{id}` | Optional geocode write-back to `metadata.geo` |
| `GET /api/v1/tasks?asset_id={id}` | Tasks for a property |
| `POST /api/v1/tasks` | "New task" form (`source: zapproperty`) |

Listing data comes from `property.listing` on each asset (`listing_type`, `price_amount`/`price_qualifier`/`price_label`, `deposit_amount`, `available_from`, `council_tax_band`, `epc_rating`, `broadband`, `key_features`, `description`, `visibility`) plus `property.bathrooms`, `property.receptions` and `property.furnishing`. Any section whose `visibility` flag is `false` is nulled out before the response leaves the server.

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
    zaptask.ts                       Typed Platform API client: portal listings + company assets/tasks
    geocode.ts                       Mapbox Geocoding v6 with cache + concurrency limit
    properties.ts                    Loader/transform layer, demo fallback, write-back
    listing.ts                       property.listing → PropertyListing, visibility, price normalisation
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

## Troubleshooting

**A site I published in ZapTask is not showing.** `GET /api/properties` reports how many sites were held back in `meta.unlisted`, and the list header shows "· N unpublished". Check, in order:

1. **Show on ZapProperty** is ticked *and saved* on the site in ZapTask. Then hit the refresh button in the header — the list is cached for a short while.
2. `meta.scope` is `platform`. With a **company key** (`zt_live_…`, `meta.scope: "company"`) only that company's sites are visible, however other companies' sites are flagged — the fix is to switch to the portal key (see above). If `meta.total` is `0` and `meta.unlisted` matches the number of sites you expect, the key is fine and only the checkbox is the problem.
3. The site is **active** in ZapTask (inactive/archived sites are never returned by the API), and `ZAPTASK_ASSET_TYPE` is blank or matches the site's type.

**`503` "ZapProperty portal is not enabled".** `ZAPPROPERTY_API_KEY` is not set on the ZapTask server. Generate one with `php artisan zapproperty:key` and set it on both sides.

**Photos show as "Photos unavailable".** ZapTask has photo *records* but the *files* are gone. This happens when ZapTask stores uploads on a local disk on a host with an ephemeral filesystem (e.g. Heroku), which is wiped on every deploy. Switch ZapTask's filesystem disk to persistent object storage (S3, Supabase Storage…) and re-upload the photos; ZapProperty needs no change.

**`525` / "No such app" from `app.zaptask.co.uk` or `api.zaptask.co.uk`.** A Cloudflare 525 means the TLS handshake with the origin failed — usually because the hostname is proxied by Cloudflare but not attached to the Heroku app (`heroku domains:add app.zaptask.co.uk`, then point the Cloudflare CNAME at the DNS target Heroku prints). Until it is fixed, set `ZAPTASK_BASE_URL` to a hostname that does reach ZapTask (e.g. `https://www.zaptask.co.uk`) and remove the override afterwards.
