// Where each part of the pipeline is, for the robot screen: the tracker, the two process buttons and
// the flow line all read it from here.
import type { Emotion } from "@/lib/api/contracts";
import { EMOTION_LABEL } from "@/lib/emotions";
import { BERT_STEP_COUNT, VITS_STEP_COUNT, type PipelineStore } from "@/store/pipelineStore";

/** pending = not reached yet, ready = running in the background (open it to watch), active = running on screen. */
export type PartState = "pending" | "ready" | "active" | "done" | "error";

export interface FlowState {
  bert: PartState;
  vits: PartState;
  robot: PartState;
  /** One short line under each process button. */
  bertNote: string;
  vitsNote: string;
  /** What is happening now, in one sentence (shown under the tracker). */
  headline: string;
}

/** How the voice sounds, as an adjective ("sounding happy"). */
const SOUNDING: Record<Emotion, string> = { neutral: "calm", happiness: "happy", sadness: "sad", anger: "angry", fear: "afraid" };

type Inputs =Pick<PipelineStore, "stage" | "view" | "bertStep" | "vitsStep" | "emotion" | "tts" | "error">;

export function flowState({ stage, view, bertStep, vitsStep, emotion, tts, error }: Inputs): FlowState {
  const label = emotion ? EMOTION_LABEL[emotion.predictedEmotion].toLowerCase() : "";
  switch (stage) {
    case "understanding": {
      const ready = view !== "indicbert";
      return {
        bert: ready ? "ready" : "active",
        vits: "pending",
        robot: "pending",
        bertNote: `Step ${bertStep + 1} of ${BERT_STEP_COUNT}${ready ? ". Open to watch" : ""}`,
        vitsNote: "Waits for IndicBERT",
        headline: ready
          ? "IndicBERT is working out how the sentence feels. Open “IndicBERT Process” to watch."
          : "IndicBERT is working out how the sentence feels.",
      };
    }
    case "handoff":
      return {
        bert: "done",
        vits: "pending",
        robot: "pending",
        bertNote: `Sending “${label}” to VITS`,
        vitsNote: "Receiving the five values",
        headline: "The five emotion values travel from IndicBERT to VITS.",
      };
    case "speaking": {
      const ready = view !== "vits";
      return {
        bert: "done",
        vits: ready ? "ready" : "active",
        robot: "pending",
        bertNote: `Done: ${label}`,
        vitsNote: `${tts ? `Step ${vitsStep + 1} of ${VITS_STEP_COUNT}` : "Working…"}${ready ? ". Open to watch" : ""}`,
        headline: ready
          ? "VITS is making the voice. Open “VITS Process” to watch."
          : "VITS is making the voice.",
      };
    }
    case "playing":
      return {
        bert: "done",
        vits: "done",
        robot: "active",
        bertNote: `Done: ${label}`,
        vitsNote: "Voice sent to the robot",
        headline: `The robot reads the sentence aloud, sounding ${emotion ? SOUNDING[emotion.predictedEmotion] : "calm"}.`,
      };
    case "done":
      return {
        bert: "done",
        vits: "done",
        robot: "done",
        bertNote: `Done: ${label}`,
        vitsNote: "Done: voice made",
        headline: "Finished. Press Replay to watch it again, or Play voice in the VITS screen.",
      };
    case "error": {
      const inBert = error?.panel === "indicbert";
      return {
        bert: inBert ? "error" : "done",
        vits: inBert ? "pending" : "error",
        robot: "pending",
        bertNote: inBert ? "Problem. Open to try again" : `Done: ${label}`,
        vitsNote: inBert ? "Waits for IndicBERT" : "Problem. Open to try again",
        headline: error?.message ?? "Something went wrong.",
      };
    }
    default:
      return { bert: "pending", vits: "pending", robot: "pending", bertNote: "", vitsNote: "", headline: "" };
  }
}
