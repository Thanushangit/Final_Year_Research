# Claude Code Prompt — Emotion-Aware Sri Lankan Tamil TTS Demo Dashboard

> **How to use:** Create an empty folder, open Claude Code inside it, and paste everything below the line.
> Claude Code will work **phase by phase** and stop after each phase so you can check it in the browser.
> Reply `continue` to move to the next phase.

---

## ROLE

You are a senior frontend engineer and 3D/animation developer. You are building a demo dashboard for an undergraduate research project. The dashboard must explain the research pipeline visually to a supervisor and examiners. It must NOT look like a normal admin dashboard.

Work in phases. **After each phase: run `npm run build` and `npm run lint`, fix all errors, summarise what you built in plain simple English, list anything I must check in the browser, then STOP and wait for me to say `continue`.** Do not start the next phase on your own.

Before writing code in Phase 0, use plan mode / think through the full plan and show it to me.

---

## PROJECT CONTEXT (source of truth — do not change these decisions)

- Project: **Emotion-Aware Sri Lankan Tamil Text-to-Speech Generation Using Automatic Text-Based Emotion Prediction** (ITC4166, University of Sri Jayewardenepura).
- Pipeline:
  1. User enters a **Sri Lankan Tamil sentence** and selects a **Speaker ID**.
  2. **IndicBERT** (`ai4bharat/IndicBERTv2-MLM-only`, fine-tuned) predicts a **5-class emotion probability vector**: `neutral, happiness, sadness, anger, fear`.
  3. The **probability vector** (not only the top label) is passed to **VITS** (starting checkpoint: Meta MMS-TTS Tamil `facebook/mms-tts-tam`, VITS-based).
  4. Inside VITS, the probability vector is projected into an **emotion embedding**. The emotion embedding is kept **separate** from the speaker embedding (never merged), and conditions the text encoder, duration predictor and decoder.
  5. VITS outputs a waveform. The 3D robot speaks it with lip-sync.
- Speakers: exactly **4 speakers**, IDs `SPK01`, `SPK02`, `SPK03`, `SPK04` (all Sri Lankan Tamil, Jaffna). Use a select/segmented control, not free text.
- Models are **not ready yet**. Use **mock Next.js API routes** that return realistic dummy data with the **same request/response shape** the real Python backend will use later. Swapping to the real backend must only require setting one env variable.
- Every screen that shows mock values must show a small, clear **"Sample data"** badge, so the demo is honest in front of the supervisor. The badge disappears automatically when the real backend is connected.

---

## TECH STACK (install latest stable versions; check peer-dependency compatibility, especially React 19 with @react-three/fiber v9)

- Next.js (App Router) + TypeScript (strict) + Tailwind CSS + ESLint
- `three`, `@react-three/fiber`, `@react-three/drei`, `@react-three/postprocessing` (optional, subtle only)
- `gsap` for choreographed robot timelines; `useFrame` for procedural motion (blink, breathing, lip-sync)
- `motion` (Framer Motion) for 2D panel transitions
- `zustand` for global pipeline state
- `zod` for validating API requests and responses
- `wavesurfer.js` for the output waveform display
- `clsx` + `tailwind-merge`
- Fonts via `next/font/google`: **Anek Tamil** (headings + all Tamil text) and **Hind Madurai** (body). Both support Tamil and Latin.

Do not add UI component kits (no shadcn, MUI, Chakra). Build the components by hand so the look is unique.

---

## FOLDER STRUCTURE (follow exactly)

```
src/
  app/
    layout.tsx
    page.tsx                      # input screen → stage screen (same route, state-driven)
    globals.css
    api/
      emotion/route.ts            # POST: IndicBERT (mock or proxy)
      tts/route.ts                # POST: VITS (mock or proxy)
      health/route.ts             # GET: reports mock vs real backend
  components/
    input/
      SentenceInput.tsx
      SpeakerSelect.tsx
      SamplePresets.tsx
    stage/
      StageLayout.tsx             # 3-column stage
      SignalPath.tsx              # animated "data packet" travelling between sections
      PresenterControls.tsx       # Auto / Step mode, Next step, speed, replay
    indicbert/
      IndicBertPanel.tsx
      steps/                      # one component per step (see Phase 3)
    vits/
      VitsPanel.tsx
      steps/                      # one component per step (see Phase 4)
      AudioPlayer.tsx             # play, waveform, download
    robot/
      RobotScene.tsx              # <Canvas>, lights, camera, table, paper
      Robot.tsx                   # procedural articulated robot
      parts/                      # Head.tsx, Face.tsx, Eyes.tsx, Lips.tsx, Arm.tsx, Hand.tsx, Torso.tsx
      Paper.tsx                   # paper mesh with Tamil text CanvasTexture
      Desk.tsx
      useRobotTimeline.ts         # GSAP choreography (pick, read, speak, return)
      useLipSync.ts               # Web Audio analyser → mouth values
      useIdleMotion.ts            # blink, breathing, saccades, micro head motion
      emotionPose.ts              # per-emotion face/body offsets
    ui/
      SampleDataBadge.tsx
      StepCard.tsx
      Heatmap.tsx                 # reusable 2D grid heatmap (canvas)
      ProbabilityBars.tsx
  lib/
    api/
      client.ts                   # fetch wrappers used by the UI
      contracts.ts                # zod schemas + TS types (single source of truth)
    mock/
      emotionMock.ts
      ttsMock.ts
      wavEncoder.ts               # generate placeholder speech-like WAV
      presets.ts                  # sample Tamil sentences
      seeded.ts                   # deterministic random from text hash
    audio/
      audioEngine.ts              # one shared AudioContext + AnalyserNode
    config.ts                     # reads MODEL_API_URL env
  store/
    pipelineStore.ts              # zustand
  types/
    index.ts
public/
  mock-audio/                     # optional real WAVs: SPK01.wav … SPK04.wav
  fonts/
.env.example
CLAUDE.md                         # create it: summary of this prompt + conventions
README.md                         # how to run, how to connect the real backend
```

---

## API CONTRACTS (put in `lib/api/contracts.ts` with zod)

### `POST /api/emotion`
Request:
```json
{ "text": "string (Tamil, 1–300 chars)" }
```
Response:
```json
{
  "source": "mock" | "model",
  "normalizedText": "string",
  "tokens": [{ "token": "▁நாளை", "id": 12345 }],
  "embeddingPreview": [[0.12, -0.4, "...16 values per token"]],
  "attention": [[0.1, "...token x token matrix, last layer, averaged heads"]],
  "clsVectorPreview": [0.03, "...32 of 768 values"],
  "logits": { "neutral": 0.4, "happiness": 2.9, "sadness": -0.6, "anger": -1.1, "fear": -0.9 },
  "probabilities": { "neutral": 0.07, "happiness": 0.82, "sadness": 0.04, "anger": 0.03, "fear": 0.04 },
  "predictedEmotion": "happiness",
  "confidence": 0.82,
  "timingsMs": { "normalize": 4, "tokenize": 6, "encoder": 41, "classify": 2 }
}
```

### `POST /api/tts`
Request:
```json
{
  "text": "string",
  "speakerId": "SPK01" | "SPK02" | "SPK03" | "SPK04",
  "emotionVector": { "neutral": 0.07, "happiness": 0.82, "sadness": 0.04, "anger": 0.03, "fear": 0.04 },
  "predictedEmotion": "happiness"
}
```
Response:
```json
{
  "source": "mock" | "model",
  "inputSymbols": ["ந", "ா", "ள", "ை", "..."],
  "speakerEmbeddingPreview": [0.2, "...16 values"],
  "emotionEmbeddingPreview": [0.1, "...16 values"],
  "durations": [3, 5, 4, "...frames per input symbol"],
  "alignment": [[0, 1, "...symbols x frames, 0/1 or soft"]],
  "melSpectrogram": [[-4.1, "...80 mel bins x N frames, downsampled"]],
  "prosody": { "meanPitchHz": 210, "pitchRange": 1.25, "energy": 1.1, "speakingRate": 1.08 },
  "audio": { "base64Wav": "string", "sampleRate": 22050, "durationSec": 3.2 },
  "timingsMs": { "textEncoder": 18, "durationPredictor": 6, "flow": 22, "decoder": 55 }
}
```

### Backend switch (`lib/config.ts`)
- If `MODEL_API_URL` is set, the API routes **proxy** the request to `${MODEL_API_URL}/emotion` and `${MODEL_API_URL}/tts` (future Python FastAPI) and validate the response with zod.
- If not set, use the mock modules. Add a fake processing delay (emotion ~1.2 s, tts ~2.5 s) so the animations have time to play.
- `GET /api/health` returns `{ backend: "mock" | "model" }`.

---

## MOCK DATA RULES

- `presets.ts` — include these sample Sri Lankan Tamil sentences as one-click presets (one per emotion):
  - neutral: `நாளை காலை பத்து மணிக்கு கூட்டம் நடைபெறும்.`
  - happiness: `எனக்கு பல்கலைக்கழகத்தில் இடம் கிடைத்தது, மிகவும் சந்தோசமாக இருக்கிறது!`
  - sadness: `அம்மா ஊருக்குப் போனதிலிருந்து வீடு வெறுமையாக இருக்கிறது.`
  - anger: `எத்தனை முறை சொன்னாலும் நீ கேட்கவே மாட்டாயா?`
  - fear: `இரவில் யாரோ கதவைத் தட்டும் சத்தம் கேட்டது, எனக்கு பயமாக இருக்கிறது.`
- `emotionMock.ts`: preset sentences must return their correct emotion with high probability. Any other text: simple keyword scoring (e.g. சந்தோசம், மகிழ்ச்சி → happiness; கவலை, வெறுமை, அழு → sadness; கோபம், மாட்டாயா → anger; பயம், அச்சம் → fear) plus deterministic noise from a text hash, then softmax. Same text must always give the same result.
- Tokens: split into fake SentencePiece-style subwords (prefix `▁` on word starts), add `[CLS]` and `[SEP]`.
- `ttsMock.ts`: input symbols = Tamil grapheme clusters (use `Intl.Segmenter`). Durations, alignment and mel are generated so they visually look plausible (diagonal alignment, formant-like bands in mel). Prosody numbers change with emotion (happiness: higher pitch + faster; sadness: lower pitch + slower; anger: higher energy; fear: higher pitch + wider range; neutral: baseline) and slightly with speaker.
- Audio: if `public/mock-audio/{speakerId}.wav` exists, return it as base64. Otherwise `wavEncoder.ts` generates a **speech-like placeholder** (syllable-rate amplitude envelope ~4–5 Hz, voiced buzz with 2–3 formant bands, short pauses at spaces, length based on sentence length and speaking rate). This is needed so lip-sync can be tested without real audio.

---

## DESIGN DIRECTION

Concept: **"The Reading Room."** A robot sits at a desk under a warm lamp. On its left is the "understanding" lab (IndicBERT). On its right is the "speaking" lab (VITS). A glowing data packet travels from left → into VITS → up into the robot. The story is: *read the words → understand the feeling → speak with that feeling.*

Palette (define as CSS variables + Tailwind theme):
- Ink navy `#0F1C33` (stage background)
- Navy `#1B2E50` (headings, lines)
- Gold `#C9A227` (accent, data packet, active step)
- Panel white `#FFFFFF` and soft grey `#E7EAF0` (lab panels, light theme)
- Emotion colours: neutral `#8A94A6`, happiness `#E3B23C`, sadness `#4F7CAC`, anger `#C2453D`, fear `#7A5C99`

Layout:
```
INPUT SCREEN (before submit)
┌──────────────────────────────────────────────────┐
│   Robot idle at desk (small, dim lamp)           │
│   Large Tamil textarea                           │
│   Speaker: [SPK01][SPK02][SPK03][SPK04]          │
│   Sample sentences (5 chips)    [ Read aloud ]   │
└──────────────────────────────────────────────────┘

STAGE SCREEN (after submit) — desktop ≥1280px
┌───────────────┬──────────────────────┬───────────────┐
│ Understanding │                      │ Speaking      │
│ (IndicBERT)   │   3D ROBOT STAGE     │ (VITS)        │
│ step list     │   lamp, desk, paper  │ step list     │
│               │                      │ player + DL   │
└───────┬───────┴──────────┬───────────┴───────┬───────┘
        └──── gold packet ─┴──── emotion vector┘
   [Auto | Step]  [Next step]  [Speed 0.5x 1x 2x]  [Replay]  [New sentence]
```
- On tablet/mobile: stack Robot → IndicBERT → VITS.
- Rules: no identical rounded-card grid, no gradient washes, no ALL-CAPS eyebrow labels, no `→` in button text, no emojis. Step lists are a real sequence, so numbered steps are allowed there only.
- Button text uses plain verbs: "Read aloud", "Next step", "Play voice", "Download voice", "Try another sentence".
- Respect `prefers-reduced-motion` (robot still works, but camera moves and packet animation are reduced). Visible keyboard focus everywhere.

---

## PHASES

### Phase 0 — Setup
- `create-next-app` with TypeScript, Tailwind, ESLint, App Router, `src/` dir.
- Install all dependencies listed above. Resolve version conflicts.
- Create the folder structure, `CLAUDE.md`, `.env.example` (`MODEL_API_URL=`), and theme tokens.
- STOP.

### Phase 1 — Contracts, mocks, API routes, store
- `contracts.ts` with zod schemas exactly as above.
- Mock modules + `wavEncoder.ts`.
- API routes with mock/proxy switch and zod validation; return clear JSON errors (400 for bad input, 502 for backend failure).
- `pipelineStore.ts` holds: input, speaker, stage (`idle | understanding | handoff | speaking | playing | done | error`), emotion result, tts result, current step index per panel, presenter mode, speed.
- Show me example `curl` commands for both routes. STOP.

### Phase 2 — Input screen + stage layout + presenter controls
- Input screen with validation (Tamil text required, max 300 chars, speaker required).
- Submit flow: call `/api/emotion` → animate IndicBERT steps → packet animation → call `/api/tts` with the **probability vector** → animate VITS steps → hand audio to robot.
- **Presenter controls:** "Auto" plays all steps; "Step" mode waits for "Next step" (also Space / → key) so I can explain each step to my supervisor. Speed control and Replay (replays animations without calling the API again).
- `SignalPath` animated packet between sections. Use a placeholder box for the robot in this phase. STOP.

### Phase 3 — IndicBERT panel ("Understanding")
Each step is a component in `indicbert/steps/`, revealed one by one, each with a one-line plain-English explanation and a small "What the model does" expandable note:
1. **Input sentence** — the raw Tamil text.
2. **Normalisation** — Unicode NFC normalisation, number/abbreviation expansion; show before/after.
3. **Tokenisation** — subword chips with token IDs, `[CLS]` and `[SEP]` highlighted.
4. **Token embeddings** — heatmap (tokens × 16 dims preview), label "768 dimensions, showing 16".
5. **Transformer encoder** — 12 stacked layers animating; an attention heatmap (token × token); hover a token to highlight what it attends to.
6. **Sentence representation** — the `[CLS]` vector preview as a bar strip.
7. **Classification head** — show logits for 5 emotions.
8. **Softmax** — animate logits turning into probabilities; bars in emotion colours; numbers with tabular figures.
9. **Predicted emotion** — top emotion + confidence; also a note that the **full vector** is sent, not only the label.
10. **Send to VITS** — trigger the packet animation carrying the 5 values.

Important wording: the "emotion embedding" is created inside VITS from this vector (Phase 4, step 3). Do not label anything in this panel as "emotion embedding".
STOP.

### Phase 4 — VITS panel ("Speaking")
Steps in `vits/steps/`:
1. **Three inputs** — sentence, speaker ID, emotion probability vector (received from IndicBERT, shown as 5 mini bars).
2. **Text to symbols** — Tamil grapheme/character symbols the model reads (MMS-TTS Tamil uses character input); show as chips.
3. **Conditioning** — two separate lanes: *Speaker embedding* (lookup table: SPK0x → vector) and *Emotion embedding* (5 values → linear projection → vector). Visually show they stay separate and both feed the model. Add a one-line reason: "Kept separate so the model does not confuse a voice with a feeling."
4. **Text encoder** — symbols become hidden vectors (small animated block).
5. **Duration predictor** — bar chart of frames per symbol; emotion changes the speaking rate (show the prosody numbers).
6. **Alignment** — alignment matrix heatmap (symbols × frames), diagonal path animates in.
7. **Flow + decoder (HiFi-GAN style)** — mel-spectrogram heatmap drawn left to right, then turns into a waveform.
8. **Output voice** — `AudioPlayer`: waveform (wavesurfer.js), Play voice, **Download voice** (`tts-{speakerId}-{emotion}-{timestamp}.wav`), duration, sample rate.
When step 8 is reached, signal the robot to start speaking (shared `audioEngine`). STOP.

### Phase 5 — 3D robot: model and scene (no choreography yet)
Build the robot **procedurally from Three.js geometry** (no external GLB download, no licensing issues). It must be a friendly humanoid robot, not a box robot:
- Rounded head (capsule/sphere blend) with a soft face plate; **eyes** with iris, pupil and real **eyelids** (upper/lower, so blinks look natural); **eyebrows** (thin bars that can tilt); **articulated lips**: separate upper lip and lower lip meshes plus a jaw pivot, so the mouth can open, widen, round and close.
- Neck joint; torso with chest panel that glows softly in the current emotion colour.
- Two arms with shoulder, elbow and wrist joints as nested `<group>`s with correct pivot points; hands with a palm and 3 fingers + thumb, each finger with 2 segments that can curl (needed to grip the paper).
- Desk, desk lamp (warm point/spot light, soft shadows), a sheet of paper lying on the desk.
- **Paper text:** render the input Tamil sentence onto an HTML `<canvas>` with the Anek Tamil font, then use it as a `CanvasTexture`. Do NOT use drei `<Text>` for Tamil — it does not shape Tamil script correctly.
- Materials: matte white/ivory shell, navy joints, gold small accents. `meshPhysicalMaterial` with light clearcoat. `ContactShadows` under the desk. Camera fixed, slight 3/4 view, no orbit controls in the final UI (allow OrbitControls only behind a `?debug=1` flag).
- Performance: target 60 fps on an integrated laptop GPU; `dpr={[1, 2]}`, limited shadow map size, no heavy postprocessing.
- Show me the static robot from 3 camera angles via `?debug=1`. STOP.

### Phase 6 — Robot choreography, lip-sync and natural motion
Three motion layers that **add together** every frame:

**Layer A — Choreography (`useRobotTimeline.ts`, GSAP timeline):**
1. Submit → robot looks down at the paper (head + eyes lead, head follows ~150 ms later).
2. Reaches with right arm (shoulder → elbow → wrist, overlapping timing, ease-in-out), fingers curl to grip, paper becomes a child of the hand.
3. Lifts paper to reading position, left hand comes up to hold the other side.
4. **Reading loop** while IndicBERT/VITS run: eyes scan left-to-right line by line, small head follow, occasional blink, slight nod at line ends. Loops until audio is ready.
5. Audio ready → lowers the paper slightly, looks up toward the camera (eyes first), small breath in, then speaks.
6. After speaking → short pause, places paper back on desk, returns to idle.
Use overlapping action and follow-through (no two joints start or stop at exactly the same time). Never use linear easing for body motion.

**Layer B — Lip-sync (`useLipSync.ts`):**
- Connect the playing audio to an `AnalyserNode` (shared `audioEngine.ts`).
- Each frame compute RMS → smoothed **jaw open** (fast attack ~40 ms, slower release ~90 ms).
- Use frequency band energy to approximate mouth shape: more low-band energy → rounder lips; more high-band energy → wider lips; near silence → lips closed (with a small "press" on plosive-like sudden onsets).
- Add tiny random variation so it never looks mechanical. Lips must fully close during pauses between words.
- Speech-linked motion: small head nods on strong syllables, eyebrows lift slightly on loud peaks, gentle hand gestures with the paper hand still.

**Layer C — Idle/life motion (`useIdleMotion.ts`):**
- Blink every 2–6 s randomly (fast close ~80 ms, slower open ~150 ms), occasional double blink.
- Breathing: chest + shoulders rise ~0.25 Hz.
- Eye micro-saccades; in idle the eyes and head gently follow the mouse pointer.
- Tiny weight shifts every few seconds.

**Emotion pose (`emotionPose.ts`):** offsets applied on top of everything, blended over 600 ms:
- happiness: brows up, lip corners up, head slightly up, bouncier gestures.
- sadness: brows inner-up, eyelids lower, head down, slower motion.
- anger: brows down/in, eyes narrower, sharper gestures.
- fear: brows up and together, eyes wider, shoulders raised, small trembling in hands.
- neutral: baseline.
Chest light colour = predicted emotion colour.

Also: when the user presses Play voice in the VITS panel again, the robot speaks again (lifting the paper if needed). STOP.

### Phase 7 — Polish and handover
- Loading, empty and error states (e.g. "The emotion model did not respond. Check that the backend is running or remove MODEL_API_URL to use sample data.").
- Keyboard: Enter submits, Space/→ next step, R replay.
- Reduced motion support, focus states, responsive check at 375 / 768 / 1280 / 1920 px.
- `README.md`: how to run, folder overview, the API contract, and **"How to connect the real models"** (set `MODEL_API_URL`, expected FastAPI endpoints `/emotion` and `/tts`, same JSON shape).
- Final `npm run build` with zero errors and zero lint warnings. STOP.

---

## GENERAL RULES
- TypeScript strict, no `any`. Small components (< 200 lines each where possible).
- Robot code split by part; all joint angles and timings in one constants file so I can tune them.
- No hardcoded API URLs in components; always go through `lib/api/client.ts`.
- Comments only where the logic is not obvious; write them in simple English.
- If something in this prompt is technically wrong or would hurt quality, tell me before you do it, with a better option.
