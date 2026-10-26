import { EmotionRequestSchema, EmotionResponseSchema } from "@/lib/api/contracts";
import { errorResponse, parseBody, proxyToModel } from "@/lib/api/server";
import { getModelApiUrl } from "@/lib/config";

const BACKEND_DOWN =
  "The emotion model did not respond. Check that the IndicBERT backend is running and EMOTION_API_URL is correct.";
const NOT_CONNECTED =
  "The emotion model is not connected. Set EMOTION_API_URL in .env.local to the IndicBERT backend address.";

/**
 * IndicBERT: Tamil sentence in, 5-class emotion probabilities (and what happened inside) out.
 * Real model only (user's decision): there is no sample data, so a missing EMOTION_API_URL is an error.
 */
export async function POST(request: Request) {
  const body = await parseBody(request, EmotionRequestSchema);
  if ("response" in body) return body.response;

  if (!getModelApiUrl("emotion")) return errorResponse(503, "BACKEND_NOT_SET", NOT_CONNECTED);
  return proxyToModel("emotion", body.data, EmotionResponseSchema, BACKEND_DOWN);
}
