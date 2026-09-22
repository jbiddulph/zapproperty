import { NextResponse } from "next/server";
import { ZapTaskApiError } from "./zaptask";

export function jsonError(error: unknown, fallback = "Something went wrong."): NextResponse {
  if (error instanceof ZapTaskApiError) {
    const status = error.status >= 400 && error.status < 600 ? error.status : 502;
    return NextResponse.json(
      { error: error.message, status, details: (error.body as { errors?: unknown } | undefined)?.errors },
      { status },
    );
  }

  console.error("[zapproperty]", error);
  return NextResponse.json({ error: fallback, status: 500 }, { status: 500 });
}

export function parseId(raw: string): number | null {
  const id = Number.parseInt(raw, 10);
  return Number.isInteger(id) && id > 0 ? id : null;
}
