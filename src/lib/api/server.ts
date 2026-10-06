// Helpers shared by the API route handlers (server only).
import "server-only";
import { NextResponse } from "next/server";
import type { z } from "zod";
import { BACKEND_TIMEOUT_MS, getModelApiUrl } from "@/lib/config";
import type { ApiErrorBody } from "./contracts";

type Issues = NonNullable<ApiErrorBody["error"]["issues"]>;

export function errorResponse(status: number, code: string, message: string, issues?: Issues) {
  return NextResponse.json<ApiErrorBody>({ error: { code, message, ...(issues ? { issues } : {}) } }, { status });
}

const toIssues = (error: z.ZodError): Issues =>
  error.issues.map((issue) => ({ path: issue.path.map(String).join("."), message: issue.message }));

/** Reads and validates the JSON body. Gives back the data, or a ready 400 response. */
export async function parseBody<Schema extends z.ZodType>(
  request: Request,
  schema: Schema,
): Promise<{ data: z.output<Schema> } | { response: NextResponse }> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return { response: errorResponse(400, "BAD_REQUEST", "The request body must be valid JSON.") };
  }
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    const issues = toIssues(parsed.error);
    return { response: errorResponse(400, "BAD_REQUEST", issues[0]?.message ?? "Invalid request.", issues) };
  }
  return { data: parsed.data };
}

/**
 * Forwards the request to the real Python backend and checks the reply has the agreed shape.
 * Any failure (can't connect, timeout, HTTP error, wrong JSON) becomes a 502 with a clear message.
 */
export async function proxyToModel<Schema extends z.ZodType>(
  endpoint: "emotion" | "tts",
  payload: unknown,
  schema: Schema,
  failureMessage: string,
): Promise<NextResponse> {
  const url = `${getModelApiUrl()}/${endpoint}`;
  const fail = (detail: string) => errorResponse(502, "BACKEND_ERROR", failureMessage, [{ path: url, message: detail }]);

  let reply: Response;
  try {
    reply = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(BACKEND_TIMEOUT_MS),
      cache: "no-store",
    });
  } catch (error) {
    const timedOut = error instanceof Error && error.name === "TimeoutError";
    return fail(timedOut ? `No reply within ${BACKEND_TIMEOUT_MS / 1000} seconds.` : "Could not connect.");
  }
  if (!reply.ok) return fail(`The backend answered with HTTP ${reply.status}.`);

  let json: unknown;
  try {
    json = await reply.json();
  } catch {
    return fail("The backend reply was not JSON.");
  }
  // A backend that leaves out "source" is the real model by definition.
  if (json && typeof json === "object" && !("source" in json)) json = { ...json, source: "model" };

  const parsed = schema.safeParse(json);
  if (!parsed.success) {
    return errorResponse(
      502,
      "BACKEND_ERROR",
      "The backend replied, but not in the agreed JSON shape. See the API contract in README.md.",
      toIssues(parsed.error),
    );
  }
  return NextResponse.json(parsed.data);
}

export const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));
