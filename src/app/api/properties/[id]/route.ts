import { NextResponse } from "next/server";
import { jsonError, parseId } from "@/lib/api-response";
import { loadPropertyDetail } from "@/lib/properties";

export const dynamic = "force-dynamic";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: rawId } = await params;
  const id = parseId(rawId);
  if (id === null) {
    return NextResponse.json({ error: "Invalid property id." }, { status: 400 });
  }

  try {
    const property = await loadPropertyDetail(id);
    if (!property) {
      return NextResponse.json({ error: "Property not found." }, { status: 404 });
    }
    return NextResponse.json(property);
  } catch (error) {
    return jsonError(error, "Could not load property from ZapTask.");
  }
}
