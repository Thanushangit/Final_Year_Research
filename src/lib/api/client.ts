// Fetch wrappers the UI uses to talk to the API routes. Components never call fetch or hardcode URLs.
import type { z } from "zod";
import {
  ApiErrorBodySchema,
  EmotionResponseSchema,
  HealthResponseSchema,
  TtsResponseSchema,
  type EmotionRequest,
  type EmotionResponse,
  type HealthResponse,
  type TtsRequest,
  type TtsResponse,
} from "./contracts";

const ROUTES = {
  emotion: "/api/emotion",
  tts: "/api/tts",
  health: "/api/health",
} as const;

export class ApiRequestError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(message: string, status: number, code: string) {
    super(message);
    this.name = "ApiRequestError";
    this.status = status;
    this.code = code;
  }
}

export const isAbortError = (error: unknown): boolean =>
  error instanceof DOMException && error.name === "AbortError";

async function request<T>(path: string, schema: z.ZodType<T>, init: RequestInit): Promise<T> {
  let reply: Response;
  try {
    reply = await fetch(path, {
      ...init,
      headers: { Accept: "application/json", ...(init.body ? { "Content-Type": "application/json" } : {}) },
    });
  } catch (error) {
    if (isAbortError(error)) throw error;
    throw new ApiRequestError("Could not reach the dashboard server. Check that it is still running.", 0, "NETWORK");
  }

  const json: unknown = await reply.json().catch(() => null);
  if (!reply.ok) {
    const body = ApiErrorBodySchema.safeParse(json);
    throw new ApiRequestError(
      body.success ? body.data.error.message : `The server answered with HTTP ${reply.status}.`,
      reply.status,
      body.success ? body.data.error.code : "HTTP_ERROR",
    );
  }

  const parsed = schema.safeParse(json);
  if (!parsed.success) {
    throw new ApiRequestError("The server sent data in an unexpected shape.", reply.status, "BAD_RESPONSE");
  }
  return parsed.data;
}

/** IndicBERT: predicts the emotion probability vector for a Tamil sentence. */
export function predictEmotion(body: EmotionRequest, signal?: AbortSignal): Promise<EmotionResponse> {
  return request(ROUTES.emotion, EmotionResponseSchema, { method: "POST", body: JSON.stringify(body), signal });
}

/** VITS: speaks the sentence with the chosen speaker and the full emotion vector. */
export function synthesizeSpeech(body: TtsRequest, signal?: AbortSignal): Promise<TtsResponse> {
  return request(ROUTES.tts, TtsResponseSchema, { method: "POST", body: JSON.stringify(body), signal });
}

/** Whether the app is showing sample data ("mock") or the real models ("model"). */
export function getHealth(signal?: AbortSignal): Promise<HealthResponse> {
  return request(ROUTES.health, HealthResponseSchema, { method: "GET", cache: "no-store", signal });
}
