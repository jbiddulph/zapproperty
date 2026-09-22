import { NextResponse, type NextRequest } from "next/server";
import { jsonError } from "@/lib/api-response";
import { loadProperties } from "@/lib/properties";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const refresh = request.nextUrl.searchParams.get("refresh") === "1";
    const data = await loadProperties({ refresh });
    return NextResponse.json(data, {
      headers: { "Cache-Control": "private, max-age=30" },
    });
  } catch (error) {
    return jsonError(error, "Could not load properties from ZapTask.");
  }
}
