// Server-side settings. MODEL_API_URL switches the API routes from sample data to the real Python backend.
import "server-only";
import type { DataSource } from "@/lib/api/contracts";

/** The real backend's base URL without a trailing slash, or null to use sample data. */
export function getModelApiUrl(): string | null {
  const raw = process.env.MODEL_API_URL?.trim();
  return raw ? raw.replace(/\/+$/, "") : null;
}

export function getBackendMode(): DataSource {
  return getModelApiUrl() ? "model" : "mock";
}

/** Fake processing time for sample data, so the animations have time to play. */
export const MOCK_DELAY_MS = { emotion: 1200, tts: 2500 } as const;

/** How long to wait for the real backend before giving up. */
export const BACKEND_TIMEOUT_MS = 30_000;
