# ZapTask side of the portal key

ZapProperty reads listings through `/api/v1/zapproperty/*` on ZapTask using one platform-level key. That API lives in the ZapTask repo ([jbiddulph/taskit](https://github.com/jbiddulph/taskit)); the patch in this folder adds it.

## Apply

```bash
cd /path/to/taskit
git checkout -b zapproperty-portal-api origin/main
git am /path/to/zapproperty/zaptask/0001-zapproperty-portal-api.patch
php artisan test tests/Feature/ZapPropertyPortalApiTest.php
```

Then open a PR in taskit as usual. The patch was written against taskit `3d746cd` (merge of #48) and its tests pass on Postgres.

## Enable

```bash
php artisan zapproperty:key                       # prints a zp_live_… key
heroku config:set ZAPPROPERTY_API_KEY=zp_live_…   # ZapTask
```

Set the same value as `ZAPTASK_API_KEY` on ZapProperty (Vercel). No ZapProperty redeploy is needed beyond the env change.

## What it adds

| | |
|---|---|
| `ZAPPROPERTY_API_KEY` | `config('services.zapproperty.api_key')`. Unset = portal disabled (503). |
| `zapproperty.auth` middleware | Constant-time key compare. Company `zt_live_` keys are rejected here; the portal key is rejected on company endpoints. |
| `GET /api/v1/zapproperty/listings` | Every active site with **Show on ZapProperty** ticked, across all companies. Same payload as `/api/v1/assets` plus `agent {id, name, logo_url, website}` and `meta.unpublished_total`. Filters: `type`, `listing_type`, `company_id`, `updated_since`, `search`. |
| `GET /api/v1/zapproperty/listings/{id}` | Detail with `photos[]`; 404 unless published. |
| `GET /api/v1/zapproperty/listings/{id}/photos/{photoId}` | Photo bytes. |
| `GET/POST /api/v1/zapproperty/listings/{id}/tasks` | Tasks for a listing, created inside the listing's own company (acting as the site's creator), `source` defaults to `zapproperty`. |
| `App\Support\AssetPayload` | The asset payload builder, extracted from `AssetController` so both APIs return one shape. |
| `php artisan zapproperty:key` | Generates a key. |

Delete this folder once the patch has landed in taskit.
