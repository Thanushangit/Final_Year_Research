import { NextResponse } from "next/server";
import type { HealthResponse } from "@/lib/api/contracts";
import { getBackendMode } from "@/lib/config";

// Read EMOTION_API_URL and TTS_API_URL on every request, never at build time.
export const dynamic = "force-dynamic";

/** Tells the UI whether it is showing sample data ("mock") or the real models ("model"), overall and per model. */
export function GET() {
  // IndicBERT has no sample data: without its URL it is "missing" and /api/emotion answers with an error.
  const emotion = getBackendMode("emotion") === "model" ? "model" : "missing";
  const tts = getBackendMode("tts");
  const backend = emotion === "model" && tts === "model" ? "model" : "mock";
  return NextResponse.json<HealthResponse>({ backend, emotion, tts });
}
