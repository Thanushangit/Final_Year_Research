import { NextResponse } from "next/server";
import { EmotionRequestSchema, EmotionResponseSchema } from "@/lib/api/contracts";
import { errorResponse, parseBody, proxyToModel, sleep } from "@/lib/api/server";
import { MOCK_DELAY_MS, getModelApiUrl } from "@/lib/config";
import { mockEmotion } from "@/lib/mock/emotionMock";

const BACKEND_DOWN =
  "The emotion model did not respond. Check that the backend is running or remove MODEL_API_URL to use sample data.";

/** IndicBERT: Tamil sentence in, 5-class emotion probabilities (and what happened inside) out. */
export async function POST(request: Request) {
  const body = await parseBody(request, EmotionRequestSchema);
  if ("response" in body) return body.response;

  if (getModelApiUrl()) return proxyToModel("emotion", body.data, EmotionResponseSchema, BACKEND_DOWN);

  await sleep(MOCK_DELAY_MS.emotion);
  try {
    return NextResponse.json(EmotionResponseSchema.parse(mockEmotion(body.data.text)));
  } catch (error) {
    console.error("Sample emotion data failed", error);
    return errorResponse(500, "INTERNAL", "The sample emotion data could not be made.");
  }
}
