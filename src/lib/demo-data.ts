import { formatPrice } from "./listing";
import type { ZapTaskAsset, ZapTaskListing, ZapTaskListingVisibilityKey, ZapTaskTask } from "./zaptask";

/**
 * Sample property sites in the exact shape returned by
 * `GET /api/v1/assets`, so the rest of the pipeline is exercised unchanged.
 * Coordinates are supplied via `metadata.geo` (the same convention the app
 * writes back when `ZAPTASK_WRITE_BACK_GEOCODE` is enabled), so demo mode
 * never calls Mapbox geocoding.
 */

interface DemoListing {
  type: "rent" | "sale";
  price: number;
  qualifier: string;
  deposit?: number;
  availableFrom?: string;
  councilTax?: string;
  epc?: string;
  broadband?: string;
  features?: string[];
  description?: string;
  /** Sections the agent has hidden on the public listing. */
  hide?: ZapTaskListingVisibilityKey[];
}

interface DemoSeed {
  id: number;
  name: string;
  reference: string;
  /** Asset type in ZapTask — listings can be properties, buildings, units or sites. */
  type?: string;
  propertyType: string;
  bedrooms: number;
  bathrooms?: number;
  receptions?: number;
  furnishing?: string;
  tenure: string;
  occupancy: string;
  status: string;
  line1: string;
  line2?: string;
  city: string;
  postcode: string;
  lng: number;
  lat: number;
  clientId: number;
  /** The "Show on ZapProperty" checkbox. */
  show?: boolean;
  listing?: DemoListing;
}

const seeds: DemoSeed[] = [
  {
    id: 101, name: "12 Brunswick Square", reference: "BRN-12", propertyType: "flat", bedrooms: 2, bathrooms: 1, receptions: 1, furnishing: "furnished", tenure: "leasehold", occupancy: "occupied", status: "active", line1: "12 Brunswick Square", line2: "Flat 3", city: "Hove", postcode: "BN3 1EH", lng: -0.1590, lat: 50.8248, clientId: 1,
    listing: { type: "rent", price: 1650, qualifier: "pcm", deposit: 1903, availableFrom: "2026-11-01", councilTax: "C", epc: "C", broadband: "up to 900 Mbps", features: ["Regency square with sea glimpses", "Two double bedrooms", "Period features throughout", "Communal gardens"], description: "A beautifully presented two-bedroom apartment on the second floor of a Grade I listed Regency townhouse in Brunswick Square. Tall sash windows, high ceilings and a west-facing reception room with glimpses of the sea.\n\nOffered furnished and available from 1 November." },
  },
  {
    id: 102, name: "Marine Parade Penthouse", reference: "MP-PH", propertyType: "flat", bedrooms: 3, bathrooms: 2, receptions: 1, furnishing: "unfurnished", tenure: "leasehold", occupancy: "vacant", status: "active", line1: "84 Marine Parade", city: "Brighton", postcode: "BN2 1AJ", lng: -0.1246, lat: 50.8186, clientId: 1,
    listing: { type: "sale", price: 895000, qualifier: "guide", councilTax: "F", epc: "B", broadband: "up to 1000 Mbps", features: ["Uninterrupted sea views", "Wraparound roof terrace", "Lift access", "Secure underground parking", "Share of freehold"], description: "A rare penthouse on Brighton's seafront with panoramic views from Brighton Palace Pier to the Marina. The open-plan living space opens onto a wraparound terrace, and the principal suite has a dressing room and en-suite." },
  },
  {
    id: 103, name: "Seven Dials Townhouse", reference: "SD-7", propertyType: "terraced", bedrooms: 4, bathrooms: 2, receptions: 2, tenure: "freehold", occupancy: "occupied", status: "active", line1: "7 Vernon Terrace", city: "Brighton", postcode: "BN1 3JG", lng: -0.1519, lat: 50.8306, clientId: 2,
    listing: { type: "sale", price: 1100000, qualifier: "offers_over", councilTax: "G", epc: "D", features: ["Four-storey Victorian townhouse", "South-facing garden", "Two reception rooms", "Walk to Brighton station"], description: "An elegant Victorian townhouse arranged over four floors in the sought-after Seven Dials. Retaining its original fireplaces and cornicing, the house has a kitchen-diner opening onto a south-facing garden." },
  },
  {
    id: 104, name: "Kemptown Studio", reference: "KT-S1", type: "unit", propertyType: "studio", bedrooms: 0, bathrooms: 1, furnishing: "furnished", tenure: "leasehold", occupancy: "vacant", status: "active", line1: "22 St James's Street", city: "Brighton", postcode: "BN2 1RF", lng: -0.1338, lat: 50.8205, clientId: 2,
    listing: { type: "rent", price: 235, qualifier: "pw", deposit: 1175, availableFrom: "2026-09-15", councilTax: "A", epc: "C", broadband: "up to 500 Mbps", features: ["Available now", "Bills-inclusive option", "Moments from the seafront"], description: "A bright studio in the heart of Kemptown with a separate kitchenette and modern shower room. Quoted per week." },
  },
  {
    id: 105, name: "Preston Park Villa", reference: "PP-V", propertyType: "detached", bedrooms: 5, bathrooms: 3, receptions: 3, tenure: "freehold", occupancy: "occupied", status: "active", line1: "3 Preston Park Avenue", city: "Brighton", postcode: "BN1 6HJ", lng: -0.1478, lat: 50.8412, clientId: 3,
    listing: { type: "sale", price: 0, qualifier: "poa", councilTax: "H", epc: "E", features: ["Detached Edwardian villa", "Overlooking Preston Park", "Double garage", "Self-contained annexe"], description: "A substantial detached family home directly opposite Preston Park. Price on application." },
  },
  { id: 106, name: "Hanover Cottage", reference: "HAN-1", propertyType: "terraced", bedrooms: 2, bathrooms: 1, receptions: 1, tenure: "freehold", occupancy: "notice_served", status: "active", line1: "41 Islingword Road", city: "Brighton", postcode: "BN2 9SF", lng: -0.1264, lat: 50.8300, clientId: 3,
    listing: { type: "rent", price: 1495, qualifier: "pcm", deposit: 1725, availableFrom: "2026-12-01", councilTax: "B", epc: "D", features: ["Notice served — available December", "Courtyard garden"], hide: ["deposit"] },
  },
  {
    id: 107, name: "Portslade Semi", reference: "PS-2", propertyType: "semi-detached", bedrooms: 3, bathrooms: 1, receptions: 2, furnishing: "part_furnished", tenure: "freehold", occupancy: "occupied", status: "active", line1: "18 Locks Hill", city: "Portslade", postcode: "BN41 2LB", lng: -0.2141, lat: 50.8382, clientId: 1,
    listing: { type: "rent", price: 1850, qualifier: "pcm", deposit: 2134, availableFrom: "2026-10-10", councilTax: "C", epc: "C", broadband: "up to 300 Mbps", features: ["Three bedrooms", "Off-street parking", "Garden with shed", "Close to Portslade station"], description: "A well-kept semi-detached house with a through lounge, fitted kitchen and a 60ft rear garden. Part furnished." },
  },
  { id: 108, name: "Lewes Road HMO", reference: "LR-HMO", propertyType: "hmo", bedrooms: 6, bathrooms: 2, receptions: 1, tenure: "freehold", occupancy: "occupied", status: "active", line1: "210 Lewes Road", city: "Brighton", postcode: "BN2 3LA", lng: -0.1177, lat: 50.8386, clientId: 4, show: false },
  {
    id: 109, name: "Shoreham Harbour Apartment", reference: "SH-A4", type: "unit", propertyType: "flat", bedrooms: 1, bathrooms: 1, receptions: 1, furnishing: "unfurnished", tenure: "leasehold", occupancy: "vacant", status: "active", line1: "Ropetackle", line2: "Apt 4", city: "Shoreham-by-Sea", postcode: "BN43 5EG", lng: -0.2754, lat: 50.8330, clientId: 4,
    listing: { type: "rent", price: 1150, qualifier: "pcm", deposit: 1326, availableFrom: "2026-09-20", councilTax: "B", epc: "B", broadband: "up to 900 Mbps", features: ["Harbour views", "Allocated parking", "Balcony"], description: "A modern one-bedroom apartment in the Ropetackle development with a balcony overlooking the harbour. Unfurnished." },
  },
  {
    id: 110, name: "Rottingdean Bungalow", reference: "RD-B", propertyType: "bungalow", bedrooms: 2, bathrooms: 1, receptions: 1, tenure: "freehold", occupancy: "occupied", status: "active", line1: "9 Marine Drive", city: "Rottingdean", postcode: "BN2 7HQ", lng: -0.0612, lat: 50.8072, clientId: 2,
    listing: { type: "sale", price: 525000, qualifier: "asking", councilTax: "D", epc: "D", features: ["Detached bungalow", "Sea views from the garden", "Scope to extend (STPP)"], description: "A detached two-bedroom bungalow on Marine Drive with sea views and a generous plot offering scope to extend, subject to the usual consents." },
  },
  {
    id: 111, name: "North Laine Maisonette", reference: "NL-M", propertyType: "maisonette", bedrooms: 2, bathrooms: 1, receptions: 1, furnishing: "unfurnished", tenure: "leasehold", occupancy: "occupied", status: "active", line1: "15 Gardner Street", city: "Brighton", postcode: "BN1 1UP", lng: -0.1397, lat: 50.8253, clientId: 1,
    listing: { type: "rent", price: 1750, qualifier: "pcm", deposit: 2019, availableFrom: "2026-09-28", councilTax: "not_available", epc: "C", broadband: "up to 1000 Mbps", features: ["Two spacious bedrooms", "Local shops", "EPC C", "Private entrance", "Popular transport links", "Freshly decorated throughout", "Modern finish"], description: "Nestled in the heart of the North Laine, this delightful two-bedroom maisonette offers a perfect blend of modern living and convenience. You will be greeted by a contemporary design that enhances the natural light flowing through the home.\n\nConveniently located above the parade of local shops, the property offers a range of everyday amenities right on your doorstep. Excellent local transport links are also readily available, providing easy access to surrounding areas." },
  },
  { id: 112, name: "Hove Park House", reference: "HP-H", propertyType: "detached", bedrooms: 4, bathrooms: 2, receptions: 2, tenure: "freehold", occupancy: "vacant", status: "inactive", line1: "27 Woodland Drive", city: "Hove", postcode: "BN3 6DH", lng: -0.1862, lat: 50.8462, clientId: 3,
    listing: { type: "sale", price: 1250000, qualifier: "guide", epc: "C" } },
  { id: 113, name: "Clapham Common Flat", reference: "CC-F2", propertyType: "flat", bedrooms: 2, bathrooms: 1, receptions: 1, furnishing: "furnished", tenure: "leasehold", occupancy: "occupied", status: "active", line1: "56 Clapham Common South Side", city: "London", postcode: "SW4 9BU", lng: -0.1400, lat: 51.4553, clientId: 5,
    listing: { type: "rent", price: 2600, qualifier: "pcm", deposit: 3000, availableFrom: "2026-10-01", councilTax: "D", epc: "C", broadband: "up to 1000 Mbps", features: ["Overlooking the Common", "Furnished", "Northern line moments away"] } },
  { id: 114, name: "Shoreditch Loft", reference: "SHD-L", propertyType: "flat", bedrooms: 1, bathrooms: 1, receptions: 1, furnishing: "furnished", tenure: "leasehold", occupancy: "vacant", status: "active", line1: "3 Rivington Street", city: "London", postcode: "EC2A 3DT", lng: -0.0812, lat: 51.5262, clientId: 5,
    listing: { type: "rent", price: 36000, qualifier: "pa", deposit: 3461, availableFrom: "2026-09-01", councilTax: "E", epc: "C", features: ["Warehouse conversion", "Exposed brick and steel", "Quoted per annum"], description: "A striking loft apartment in a converted Victorian warehouse, with 4m ceilings and floor-to-ceiling crittall windows. Rent quoted per annum." } },
  { id: 115, name: "Islington Georgian", reference: "ISL-G", propertyType: "terraced", bedrooms: 4, bathrooms: 3, receptions: 2, tenure: "freehold", occupancy: "occupied", status: "active", line1: "22 Gibson Square", city: "London", postcode: "N1 0RD", lng: -0.1076, lat: 51.5373, clientId: 5, show: false,
    listing: { type: "sale", price: 3250000, qualifier: "guide", councilTax: "H", epc: "D" } },
  { id: 116, name: "Worthing Seafront", reference: "WOR-S", type: "building", propertyType: "flat", bedrooms: 3, bathrooms: 2, receptions: 1, furnishing: "unfurnished", tenure: "leasehold", occupancy: "occupied", status: "active", line1: "Heene Terrace", city: "Worthing", postcode: "BN11 3NP", lng: -0.3799, lat: 50.8095, clientId: 4,
    listing: { type: "rent", price: 1600, qualifier: "pcm", deposit: 1846, availableFrom: "2026-11-15", councilTax: "C", epc: "C", broadband: "up to 900 Mbps", features: ["Direct sea views", "Three bedrooms", "Two bathrooms", "Residents' parking"], description: "A spacious three-bedroom apartment on Worthing seafront with direct sea views from the lounge and principal bedroom." } },
];

function demoListing(seed: DemoSeed): ZapTaskListing {
  const l = seed.listing;
  const visibility = Object.fromEntries((l?.hide ?? []).map((key) => [key, false]));

  if (!l) return { show_on_zapproperty: seed.show ?? true, visibility };

  return {
    show_on_zapproperty: seed.show ?? true,
    listing_type: l.type,
    // The platform serialises its decimal columns as strings.
    price_amount: l.qualifier === "poa" ? null : l.price.toFixed(2),
    price_qualifier: l.qualifier,
    price_label: formatPrice(l.qualifier === "poa" ? null : l.price, l.qualifier),
    deposit_amount: l.deposit === undefined ? null : l.deposit.toFixed(2),
    available_from: l.availableFrom ?? null,
    council_tax_band: l.councilTax ?? null,
    epc_rating: l.epc ?? null,
    broadband: l.broadband ?? null,
    key_features: l.features ?? [],
    description: l.description ?? null,
    visibility,
  };
}

export const demoAssets: ZapTaskAsset[] = seeds.map((s, index) => ({
  id: s.id,
  company_id: 1,
  client_id: s.clientId,
  workspace_id: null,
  type: s.type ?? "property",
  name: s.name,
  reference: s.reference,
  status: s.status,
  property: {
    property_type: s.propertyType,
    bedrooms: s.bedrooms,
    bathrooms: s.bathrooms ?? null,
    receptions: s.receptions ?? null,
    tenure: s.tenure,
    occupancy_status: s.occupancy,
    furnishing: s.furnishing ?? null,
    listing: demoListing(s),
  },
  photo_count: 0,
  cover_photo_url: null,
  metadata: {
    geo: { lng: s.lng, lat: s.lat, source: "demo" },
  },
  address: {
    line_1: s.line1,
    line_2: s.line2 ?? null,
    city: s.city,
    postal_code: s.postcode,
    country: "United Kingdom",
  },
  created_at: new Date(Date.UTC(2026, 0, 10 + index)).toISOString(),
  updated_at: new Date(Date.UTC(2026, 8, 1 + index)).toISOString(),
}));

const demoTaskStore = new Map<number, ZapTaskTask[]>([
  [
    101,
    [
      { id: 9001, asset_id: 101, title: "Renew Gas Safety Certificate", status: "todo", priority: "high", category: "compliance", due_date: "2026-10-14", assigned_to: "Alex", completed_at: null },
      { id: 9002, asset_id: 101, title: "Fix dripping kitchen tap", status: "in-progress", priority: "normal", category: "maintenance", due_date: "2026-09-30", assigned_to: "Sam", completed_at: null },
    ],
  ],
  [
    102,
    [
      { id: 9003, asset_id: 102, title: "Arrange EPC assessment", status: "todo", priority: "normal", category: "compliance", due_date: "2026-10-01", assigned_to: null, completed_at: null },
      { id: 9004, asset_id: 102, title: "Professional clean before viewings", status: "done", priority: "normal", category: "lettings", due_date: "2026-09-18", assigned_to: "Jo", completed_at: "2026-09-18T15:02:00Z" },
    ],
  ],
  [
    108,
    [
      { id: 9005, asset_id: 108, title: "HMO licence renewal", status: "blocked", priority: "urgent", category: "compliance", due_date: "2026-09-25", assigned_to: "Alex", completed_at: null },
    ],
  ],
]);

let nextDemoTaskId = 9100;

export function demoTasksFor(assetId: number): ZapTaskTask[] {
  return demoTaskStore.get(assetId) ?? [];
}

export function demoCreateTask(input: {
  asset_id: number;
  title: string;
  description?: string;
  priority?: string;
  category?: string;
  due_date?: string;
  assigned_to?: string;
}): ZapTaskTask {
  const task: ZapTaskTask = {
    id: nextDemoTaskId++,
    asset_id: input.asset_id,
    title: input.title,
    description: input.description ?? null,
    status: "todo",
    priority: input.priority ?? "normal",
    category: input.category ?? null,
    due_date: input.due_date ?? null,
    assigned_to: input.assigned_to ?? null,
    completed_at: null,
    source: "zapproperty",
    created_at: new Date().toISOString(),
  };
  demoTaskStore.set(input.asset_id, [task, ...demoTasksFor(input.asset_id)]);
  return task;
}
