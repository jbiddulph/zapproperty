import type { ZapTaskAsset, ZapTaskTask } from "./zaptask";

/**
 * Sample property sites in the exact shape returned by
 * `GET /api/v1/assets`, so the rest of the pipeline is exercised unchanged.
 * Coordinates are supplied via `metadata.geo` (the same convention the app
 * writes back when `ZAPTASK_WRITE_BACK_GEOCODE` is enabled), so demo mode
 * never calls Mapbox geocoding.
 */

interface DemoSeed {
  id: number;
  name: string;
  reference: string;
  propertyType: string;
  bedrooms: number;
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
}

const seeds: DemoSeed[] = [
  { id: 101, name: "12 Brunswick Square", reference: "BRN-12", propertyType: "flat", bedrooms: 2, tenure: "leasehold", occupancy: "occupied", status: "active", line1: "12 Brunswick Square", line2: "Flat 3", city: "Hove", postcode: "BN3 1EH", lng: -0.1590, lat: 50.8248, clientId: 1 },
  { id: 102, name: "Marine Parade Penthouse", reference: "MP-PH", propertyType: "flat", bedrooms: 3, tenure: "leasehold", occupancy: "vacant", status: "active", line1: "84 Marine Parade", city: "Brighton", postcode: "BN2 1AJ", lng: -0.1246, lat: 50.8186, clientId: 1 },
  { id: 103, name: "Seven Dials Townhouse", reference: "SD-7", propertyType: "terraced", bedrooms: 4, tenure: "freehold", occupancy: "occupied", status: "active", line1: "7 Vernon Terrace", city: "Brighton", postcode: "BN1 3JG", lng: -0.1519, lat: 50.8306, clientId: 2 },
  { id: 104, name: "Kemptown Studio", reference: "KT-S1", propertyType: "studio", bedrooms: 0, tenure: "leasehold", occupancy: "vacant", status: "active", line1: "22 St James's Street", city: "Brighton", postcode: "BN2 1RF", lng: -0.1338, lat: 50.8205, clientId: 2 },
  { id: 105, name: "Preston Park Villa", reference: "PP-V", propertyType: "detached", bedrooms: 5, tenure: "freehold", occupancy: "occupied", status: "active", line1: "3 Preston Park Avenue", city: "Brighton", postcode: "BN1 6HJ", lng: -0.1478, lat: 50.8412, clientId: 3 },
  { id: 106, name: "Hanover Cottage", reference: "HAN-1", propertyType: "terraced", bedrooms: 2, tenure: "freehold", occupancy: "notice_served", status: "active", line1: "41 Islingword Road", city: "Brighton", postcode: "BN2 9SF", lng: -0.1264, lat: 50.8300, clientId: 3 },
  { id: 107, name: "Portslade Semi", reference: "PS-2", propertyType: "semi-detached", bedrooms: 3, tenure: "freehold", occupancy: "occupied", status: "active", line1: "18 Locks Hill", city: "Portslade", postcode: "BN41 2LB", lng: -0.2141, lat: 50.8382, clientId: 1 },
  { id: 108, name: "Lewes Road HMO", reference: "LR-HMO", propertyType: "hmo", bedrooms: 6, tenure: "freehold", occupancy: "occupied", status: "active", line1: "210 Lewes Road", city: "Brighton", postcode: "BN2 3LA", lng: -0.1177, lat: 50.8386, clientId: 4 },
  { id: 109, name: "Shoreham Harbour Apartment", reference: "SH-A4", propertyType: "flat", bedrooms: 1, tenure: "leasehold", occupancy: "vacant", status: "active", line1: "Ropetackle", line2: "Apt 4", city: "Shoreham-by-Sea", postcode: "BN43 5EG", lng: -0.2754, lat: 50.8330, clientId: 4 },
  { id: 110, name: "Rottingdean Bungalow", reference: "RD-B", propertyType: "bungalow", bedrooms: 2, tenure: "freehold", occupancy: "occupied", status: "active", line1: "9 Marine Drive", city: "Rottingdean", postcode: "BN2 7HQ", lng: -0.0612, lat: 50.8072, clientId: 2 },
  { id: 111, name: "North Laine Maisonette", reference: "NL-M", propertyType: "maisonette", bedrooms: 2, tenure: "leasehold", occupancy: "occupied", status: "active", line1: "15 Gardner Street", city: "Brighton", postcode: "BN1 1UP", lng: -0.1397, lat: 50.8253, clientId: 1 },
  { id: 112, name: "Hove Park House", reference: "HP-H", propertyType: "detached", bedrooms: 4, tenure: "freehold", occupancy: "vacant", status: "inactive", line1: "27 Woodland Drive", city: "Hove", postcode: "BN3 6DH", lng: -0.1862, lat: 50.8462, clientId: 3 },
  { id: 113, name: "Clapham Common Flat", reference: "CC-F2", propertyType: "flat", bedrooms: 2, tenure: "leasehold", occupancy: "occupied", status: "active", line1: "56 Clapham Common South Side", city: "London", postcode: "SW4 9BU", lng: -0.1400, lat: 51.4553, clientId: 5 },
  { id: 114, name: "Shoreditch Loft", reference: "SHD-L", propertyType: "flat", bedrooms: 1, tenure: "leasehold", occupancy: "vacant", status: "active", line1: "3 Rivington Street", city: "London", postcode: "EC2A 3DT", lng: -0.0812, lat: 51.5262, clientId: 5 },
  { id: 115, name: "Islington Georgian", reference: "ISL-G", propertyType: "terraced", bedrooms: 4, tenure: "freehold", occupancy: "occupied", status: "active", line1: "22 Gibson Square", city: "London", postcode: "N1 0RD", lng: -0.1076, lat: 51.5373, clientId: 5 },
  { id: 116, name: "Worthing Seafront", reference: "WOR-S", propertyType: "flat", bedrooms: 3, tenure: "leasehold", occupancy: "occupied", status: "active", line1: "Heene Terrace", city: "Worthing", postcode: "BN11 3NP", lng: -0.3799, lat: 50.8095, clientId: 4 },
];

export const demoAssets: ZapTaskAsset[] = seeds.map((s, index) => ({
  id: s.id,
  company_id: 1,
  client_id: s.clientId,
  workspace_id: null,
  type: "property",
  name: s.name,
  reference: s.reference,
  status: s.status,
  property: {
    property_type: s.propertyType,
    bedrooms: s.bedrooms,
    tenure: s.tenure,
    occupancy_status: s.occupancy,
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
