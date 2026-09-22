import { NextResponse } from "next/server";
import { jsonError, parseId } from "@/lib/api-response";
import { fetchPropertyPhoto } from "@/lib/properties";

export const dynamic = "force-dynamic";

/**
 * Streams a listing photo from ZapTask. The platform requires the bearer
 * token on photo URLs, so the browser fetches through this same-origin proxy
 * and the key stays server-side.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string; photoId: string }> },
) {
  const { id: rawId, photoId: rawPhotoId } = await params;
  const id = parseId(rawId);
  const photoId = parseId(rawPhotoId);
  if (id === null || photoId === null) {
    return NextResponse.json({ error: "Invalid photo reference." }, { status: 400 });
  }

  try {
    const upstream = await fetchPropertyPhoto(id, photoId);
    if (!upstream) {
      return NextResponse.json({ error: "Photos are unavailable in demo mode." }, { status: 404 });
    }
    if (!upstream.ok || !upstream.body) {
      return NextResponse.json({ error: "Photo not found." }, { status: upstream.status === 404 ? 404 : 502 });
    }

    const headers = new Headers();
    headers.set("Content-Type", upstream.headers.get("content-type") ?? "application/octet-stream");
    const length = upstream.headers.get("content-length");
    if (length) headers.set("Content-Length", length);
    headers.set("Cache-Control", "private, max-age=3600");

    return new Response(upstream.body, { status: 200, headers });
  } catch (error) {
    return jsonError(error, "Could not load photo from ZapTask.");
  }
}
