/**
 * Minimal typed client for the ZapTask Platform API (`/api/v1`).
 *
 * Mirrors the surface of `@zaptask/sdk` for the endpoints this app uses so
 * it can be swapped for the published SDK without touching call sites.
 * Company scope is derived from the `zt_live_*` key — never send company_id.
 */

export interface ZapTaskAsset {
  id: number;
  company_id: number;
  client_id?: number | null;
  workspace_id?: number | null;
  type: string;
  name: string;
  reference?: string | null;
  status?: string;
  property?: {
    property_type?: string | null;
    bedrooms?: number | null;
    tenure?: string | null;
    occupancy_status?: string | null;
  };
  photo_count?: number;
  cover_photo_url?: string | null;
  photos?: ZapTaskAssetPhoto[];
  metadata?: Record<string, unknown> | null;
  address?: {
    line_1?: string | null;
    line_2?: string | null;
    city?: string | null;
    postal_code?: string | null;
    country?: string | null;
  };
  created_at?: string;
  updated_at?: string;
}

export interface ZapTaskAssetPhoto {
  id: number;
  caption?: string | null;
  is_cover: boolean;
  sort_order: number;
  original_filename: string;
  mime_type: string;
  file_size: number;
  url: string;
}

export interface ZapTaskTask {
  id: number;
  asset_id?: number | null;
  project_id?: number | null;
  assigned_to?: string | null;
  title: string;
  description?: string | null;
  status: string;
  priority: string;
  category?: string | null;
  due_date?: string | null;
  completed_at?: string | null;
  source?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface CreateTaskInput {
  title: string;
  description?: string;
  asset_id?: number;
  project_id?: number;
  assigned_to?: string;
  status?: string;
  priority?: string;
  category?: string;
  due_date?: string;
  source?: string;
  metadata?: Record<string, unknown>;
}

export interface PageMeta {
  current_page: number;
  per_page: number;
  total: number;
  last_page: number;
}

interface ApiEnvelope<T> {
  success: boolean;
  message?: string;
  data?: T;
  errors?: Record<string, string[]>;
}

export class ZapTaskApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly body?: unknown,
  ) {
    super(message);
    this.name = "ZapTaskApiError";
  }
}

type QueryParams = Record<string, string | number | boolean | undefined | null>;

export class ZapTaskClient {
  private readonly baseUrl: string;
  private readonly apiKey: string;

  constructor(options: { baseUrl: string; apiKey: string }) {
    this.baseUrl = options.baseUrl.replace(/\/$/, "");
    this.apiKey = options.apiKey;
  }

  readonly assets = {
    list: (params?: QueryParams) =>
      this.get<{ assets: ZapTaskAsset[]; meta: PageMeta }>("/api/v1/assets", params),
    get: (id: number) => this.get<ZapTaskAsset>(`/api/v1/assets/${id}`),
    update: (id: number, input: Record<string, unknown>) =>
      this.request<ZapTaskAsset>(`/api/v1/assets/${id}`, {
        method: "PATCH",
        body: JSON.stringify(input),
      }),
    /** Raw photo bytes — the platform requires the bearer token for photo URLs. */
    photo: (assetId: number, photoId: number) =>
      this.raw(`/api/v1/assets/${assetId}/photos/${photoId}`),
  };

  readonly tasks = {
    list: (params?: QueryParams) =>
      this.get<{ tasks: ZapTaskTask[]; meta: PageMeta }>("/api/v1/tasks", params),
    create: (input: CreateTaskInput) =>
      this.request<ZapTaskTask>("/api/v1/tasks", {
        method: "POST",
        body: JSON.stringify(input),
      }),
  };

  /**
   * Walks every page of `/api/v1/assets` up to `limit` records. The platform
   * caps `per_page` at 100.
   */
  async listAllAssets(params: QueryParams, limit: number): Promise<ZapTaskAsset[]> {
    const all: ZapTaskAsset[] = [];
    let page = 1;

    while (all.length < limit) {
      const perPage = Math.min(100, limit - all.length);
      const { assets, meta } = await this.assets.list({ ...params, page, per_page: perPage });
      all.push(...assets);
      if (!meta || page >= meta.last_page || assets.length === 0) break;
      page += 1;
    }

    return all;
  }

  private async get<T>(path: string, params?: QueryParams): Promise<T> {
    const search = new URLSearchParams();
    if (params) {
      for (const [key, value] of Object.entries(params)) {
        if (value !== undefined && value !== null && value !== "") {
          search.set(key, String(value));
        }
      }
    }
    const qs = search.toString();
    return this.request<T>(`${path}${qs ? `?${qs}` : ""}`, { method: "GET" });
  }

  private async raw(path: string): Promise<Response> {
    return fetch(`${this.baseUrl}${path}`, {
      headers: { Authorization: `Bearer ${this.apiKey}` },
      cache: "no-store",
    });
  }

  private async request<T>(path: string, init: RequestInit): Promise<T> {
    const response = await fetch(`${this.baseUrl}${path}`, {
      ...init,
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
        ...(init.headers as Record<string, string> | undefined),
      },
      cache: "no-store",
    });

    const json = (await response.json().catch(() => null)) as ApiEnvelope<T> | null;

    if (!response.ok || json?.success === false) {
      throw new ZapTaskApiError(
        json?.message ?? `ZapTask request failed with status ${response.status}`,
        response.status,
        json,
      );
    }

    return (json?.data ?? json) as T;
  }
}
