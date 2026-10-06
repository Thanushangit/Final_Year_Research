import { NextResponse } from "next/server";
import type { HealthResponse } from "@/lib/api/contracts";
import { getBackendMode } from "@/lib/config";

// Read MODEL_API_URL on every request, never at build time.
export const dynamic = "force-dynamic";

/** Tells the UI whether it is showing sample data ("mock") or the real models ("model"). */
export function GET() {
  return NextResponse.json<HealthResponse>({ backend: getBackendMode() });
}
