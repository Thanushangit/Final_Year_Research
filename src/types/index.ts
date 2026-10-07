// Shared app types. API shapes live in lib/api/contracts.ts and are re-exported here for convenience.
export type {
  DataSource,
  Emotion,
  EmotionRequest,
  EmotionResponse,
  EmotionScores,
  EmotionVector,
  HealthResponse,
  Prosody,
  SpeakerId,
  Token,
  TtsRequest,
  TtsResponse,
} from "@/lib/api/contracts";

/** Where the demo is in the pipeline. */
export type Stage = "idle" | "understanding" | "handoff" | "speaking" | "playing" | "done" | "error";

/** "auto" plays every step by itself; "step" waits for the presenter to press Next step. */
export type PresenterMode = "auto" | "step";

export type Speed = 0.5 | 1 | 2;

export type PanelId = "indicbert" | "vits";

/** What the stage screen shows: the robot, or one of the two process screens slid over it. */
export type StageView = "robot" | PanelId;
