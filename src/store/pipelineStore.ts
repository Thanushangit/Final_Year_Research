// Global pipeline state: the form, where the demo is, the model results and the presenter settings.
import { create } from "zustand";
import { ApiRequestError, getHealth, isAbortError, predictEmotion, synthesizeSpeech } from "@/lib/api/client";
import {
  TamilTextSchema,
  type DataSource,
  type EmotionResponse,
  type SpeakerId,
  type TtsResponse,
} from "@/lib/api/contracts";
import type { PanelId, PresenterMode, Speed, Stage } from "@/types";

export const BERT_STEP_COUNT = 10;
export const VITS_STEP_COUNT = 8;

export interface PipelineError {
  panel: PanelId;
  message: string;
}

interface PipelineState {
  input: string;
  speakerId: SpeakerId | null;
  textError: string | null;
  speakerError: string | null;
  stage: Stage;
  emotion: EmotionResponse | null;
  tts: TtsResponse | null;
  error: PipelineError | null;
  /** Index of the last revealed step in each panel (-1 = nothing shown yet). */
  bertStep: number;
  vitsStep: number;
  mode: PresenterMode;
  speed: Speed;
  /** Goes up on every new sentence or replay, so animations restart from the beginning. */
  runId: number;
  /** Goes up every time the robot should speak (end of the run, or "Play voice"). */
  speakRequest: number;
  /** "Next step" was pressed while the model was still working; it happens when the data arrives. */
  pendingNext: boolean;
  /** The browser refused to start the sound by itself; the user has to press "Play voice". */
  voiceBlocked: boolean;
  /** "mock" or "model", from /api/health; null until known. */
  backend: DataSource | null;
  /** The 3D robot is on screen (false without WebGL), so the voice waits for it to look up. */
  robotOnline: boolean;
  /** The speakRequest the robot is ready for (it has looked up and breathed in). */
  robotReadyFor: number;
}

interface PipelineActions {
  setInput: (text: string) => void;
  setSpeaker: (speakerId: SpeakerId) => void;
  setMode: (mode: PresenterMode) => void;
  setSpeed: (speed: Speed) => void;
  setVoiceBlocked: (blocked: boolean) => void;
  loadBackend: () => Promise<void>;
  /** Checks the form, then starts a new run. IndicBERT is called straight away. */
  submit: () => Promise<void>;
  /** Shows the next step if its data is ready. Returns false when it has to wait. */
  advance: () => boolean;
  /** "Next step" button, Space or →: advance now, or as soon as the model answers. */
  requestNext: () => void;
  /** The packet has reached the VITS panel. */
  arriveAtVits: () => void;
  /** Speak the voice (again). */
  playVoice: () => void;
  /** The voice has finished playing. */
  finishSpeaking: () => void;
  /** Plays every step again with the saved results, without calling the API. */
  replay: () => void;
  /** After an error: ask the model that failed again. */
  retry: () => void;
  /** Back to the input screen, keeping the sentence and speaker. */
  reset: () => void;
  setRobotOnline: (online: boolean) => void;
  /** The robot is ready to speak for this request. */
  markRobotReady: (request: number) => void;
}

export type PipelineStore = PipelineState & PipelineActions;

// Not state: nothing re-renders when these change.
let activeRequest: AbortController | null = null;
/** Each new sentence is a new session; replies that arrive for an older session are ignored. */
let session = 0;

const messageOf = (error: unknown) =>
  error instanceof ApiRequestError ? error.message : "Something went wrong. Please try again.";

export const usePipelineStore = create<PipelineStore>()((set, get) => {
  /** Runs a "Next step" that was pressed while waiting for the model. */
  function flushPendingNext() {
    if (!get().pendingNext) return;
    set({ pendingNext: false });
    get().advance();
  }

  /** Sends the full probability vector (not only the top label) to VITS. */
  async function requestSpeech(forSession: number) {
    const { emotion, speakerId, tts } = get();
    if (tts || !emotion || !speakerId) return;
    try {
      const result = await synthesizeSpeech(
        {
          text: emotion.normalizedText,
          speakerId,
          emotionVector: emotion.probabilities,
          predictedEmotion: emotion.predictedEmotion,
        },
        activeRequest?.signal,
      );
      if (forSession !== session) return;
      set({ tts: result });
      flushPendingNext();
    } catch (error) {
      if (isAbortError(error) || forSession !== session) return;
      set({ stage: "error", error: { panel: "vits", message: messageOf(error) }, pendingNext: false });
    }
  }

  return {
    input: "",
    speakerId: null,
    textError: null,
    speakerError: null,
    stage: "idle",
    emotion: null,
    tts: null,
    error: null,
    bertStep: -1,
    vitsStep: -1,
    mode: "auto",
    speed: 1,
    runId: 0,
    speakRequest: 0,
    pendingNext: false,
    voiceBlocked: false,
    backend: null,
    robotOnline: false,
    robotReadyFor: 0,

    setInput: (input) => set({ input, textError: null }),
    setSpeaker: (speakerId) => set({ speakerId, speakerError: null }),
    setMode: (mode) => set({ mode }),
    setSpeed: (speed) => set({ speed }),
    setVoiceBlocked: (voiceBlocked) => set({ voiceBlocked }),

    loadBackend: async () => {
      try {
        const { backend } = await getHealth();
        set({ backend });
      } catch {
        set({ backend: null });
      }
    },

    submit: async () => {
      const { input, speakerId } = get();
      const text = TamilTextSchema.safeParse(input);
      if (!text.success || !speakerId) {
        set({
          textError: text.success ? null : (text.error.issues[0]?.message ?? "Check the sentence."),
          speakerError: speakerId ? null : "Choose a speaker.",
        });
        return;
      }

      activeRequest?.abort();
      const controller = new AbortController();
      activeRequest = controller;
      const current = ++session;
      set((state) => ({
        runId: state.runId + 1,
        stage: "understanding",
        emotion: null,
        tts: null,
        error: null,
        bertStep: 0,
        vitsStep: -1,
        pendingNext: false,
        voiceBlocked: false,
        textError: null,
        speakerError: null,
      }));

      try {
        const emotion = await predictEmotion({ text: text.data }, controller.signal);
        if (current !== session) return;
        set({ emotion });
        flushPendingNext();
      } catch (error) {
        if (isAbortError(error) || current !== session) return;
        set({ stage: "error", error: { panel: "indicbert", message: messageOf(error) }, pendingNext: false });
      }
    },

    advance: () => {
      const state = get();
      if (state.stage === "understanding") {
        if (!state.emotion || state.bertStep >= BERT_STEP_COUNT - 1) return false;
        const bertStep = state.bertStep + 1;
        if (bertStep < BERT_STEP_COUNT - 1) {
          set({ bertStep });
        } else {
          // Last IndicBERT step, "Send to VITS": the packet leaves and VITS is called.
          set({ bertStep, stage: "handoff" });
          void requestSpeech(session);
        }
        return true;
      }
      if (state.stage === "speaking") {
        if (!state.tts || state.vitsStep >= VITS_STEP_COUNT - 1) return false;
        const vitsStep = state.vitsStep + 1;
        set(
          vitsStep === VITS_STEP_COUNT - 1
            ? { vitsStep, stage: "playing", speakRequest: state.speakRequest + 1 }
            : { vitsStep },
        );
        return true;
      }
      return false;
    },

    requestNext: () => {
      const state = get();
      if (state.stage === "handoff") {
        state.arriveAtVits(); // skip the rest of the packet's journey
        return;
      }
      if (state.advance()) return;
      const waiting =
        (state.stage === "understanding" && !state.emotion) || (state.stage === "speaking" && !state.tts);
      if (waiting) set({ pendingNext: true });
    },

    arriveAtVits: () => {
      if (get().stage !== "handoff") return;
      set({ stage: "speaking", vitsStep: 0 });
      flushPendingNext();
    },

    playVoice: () => {
      const state = get();
      if (!state.tts) return;
      set({ stage: "playing", speakRequest: state.speakRequest + 1, voiceBlocked: false });
    },

    finishSpeaking: () => {
      if (get().stage === "playing") set({ stage: "done" });
    },

    replay: () => {
      const state = get();
      if (!state.emotion) return;
      set({
        runId: state.runId + 1,
        stage: "understanding",
        bertStep: 0,
        vitsStep: -1,
        error: null,
        pendingNext: false,
        voiceBlocked: false,
      });
    },

    retry: () => {
      const state = get();
      if (state.error?.panel === "vits" && state.emotion) {
        set({ stage: "handoff", error: null, tts: null });
        void requestSpeech(session);
      } else {
        void state.submit();
      }
    },

    reset: () => {
      activeRequest?.abort();
      activeRequest = null;
      session++;
      set({
        stage: "idle",
        emotion: null,
        tts: null,
        error: null,
        bertStep: -1,
        vitsStep: -1,
        pendingNext: false,
        voiceBlocked: false,
      });
    },

    setRobotOnline: (robotOnline) => set({ robotOnline }),
    markRobotReady: (request) => set({ robotReadyFor: request }),
  };
});
