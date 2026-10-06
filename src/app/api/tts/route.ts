import { NextResponse } from "next/server";
import { TtsRequestSchema, TtsResponseSchema } from "@/lib/api/contracts";
import { errorResponse, parseBody, proxyToModel, sleep } from "@/lib/api/server";
import { MOCK_DELAY_MS, getModelApiUrl } from "@/lib/config";
import { UnreadableTextError, mockTts } from "@/lib/mock/ttsMock";

const BACKEND_DOWN =
  "The speech model did not respond. Check that the backend is running or remove MODEL_API_URL to use sample data.";

/** VITS: sentence + speaker + emotion probability vector in, waveform (and what happened inside) out. */
export async function POST(request: Request) {
  const body = await parseBody(request, TtsRequestSchema);
  if ("response" in body) return body.response;

  if (getModelApiUrl()) return proxyToModel("tts", body.data, TtsResponseSchema, BACKEND_DOWN);

  await sleep(MOCK_DELAY_MS.tts);
  try {
    return NextResponse.json(TtsResponseSchema.parse(await mockTts(body.data)));
  } catch (error) {
    if (error instanceof UnreadableTextError) return errorResponse(400, "BAD_REQUEST", error.message);
    console.error("Sample speech data failed", error);
    return errorResponse(500, "INTERNAL", "The sample speech data could not be made.");
  }
}
