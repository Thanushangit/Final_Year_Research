// Server-side settings. EMOTION_API_URL (IndicBERT, required: there is no sample data for it) and TTS_API_URL
// (VITS, empty = sample data) point the API routes to the Python backends, so each model can run on its own server.
import "server-only";
import type { DataSource } from "@/lib/api/contracts";

export type ModelEndpoint = "emotion" | "tts";

const URL_VARIABLE: Record<ModelEndpoint, string> = { emotion: "EMOTION_API_URL", tts: "TTS_API_URL" };

/** The base URL of the backend for one endpoint, without a trailing slash, or null to use sample data. */
export function getModelApiUrl(endpoint: ModelEndpoint): string | null {
  const raw = process.env[URL_VARIABLE[endpoint]]?.trim();
  return raw ? raw.replace(/\/+$/, "") : null;
}

export function getBackendMode(endpoint: ModelEndpoint): DataSource {
  return getModelApiUrl(endpoint) ? "model" : "mock";
}

/** Fake processing time for sample data, so the animations have time to play. */
export const MOCK_DELAY_MS = { tts: 2500 } as const;

/** How long to wait for the real backend before giving up. */
export const BACKEND_TIMEOUT_MS = 30_000;
