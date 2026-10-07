@AGENTS.md

# Reading Room: Emotion-Aware Sri Lankan Tamil TTS demo dashboard

Full brief: `claude-code-prompt-tamil-tts-dashboard.md`. Progress checklist: `PROGRESS.md` (tick items as you go).

## Status (update at every phase stop)
- **Done and approved by the user:** Phase 0 (setup), Phase 1 (contracts, mocks, API routes, store),
  Phase 2 (input screen, stage layout, presenter controls, packet animation, placeholder robot, audio engine),
  Phase 3 (IndicBERT panel: 10 step visuals, Heatmap, ProbabilityBars, BarStrip, "What the model does" notes).
- **Done and approved:** Phase 4 (VITS panel: 8 step visuals, wavesurfer AudioPlayer, Download voice),
  Phase 5 (procedural robot, desk, lamp, paper, `?debug=1`), Phase 6 (choreography, lip-sync, idle life, emotions).
- **Phases were renumbered by the user:** a new Phase 7 rebuilt the robot's look from a reference image (a realistic
  android: pale bald human face, black ear discs, black cable neck, off-white armour plates, black mechanics).
  The old Phase 7 (polish) is now Phase 8.
- **Done, waiting for the user's `continue`:** Phase 7 (new robot look; every Phase 6 action kept), plus the user's
  first review: fuller cheeks / square jaw, new face shapes (frown, sneer, stretch, cheek) for human emotion faces
  with small "expression life" movements, hands resting on the desk (re-solved), the reading grip (thumb in front,
  fingers behind, bottom corners), a cream paper colour, and a new "think" scene for the VITS stage.
- **Next:** Phase 8, polish and handover. See "Plan for the remaining phases" below.
- Last check (Phase 7): `npm run build` and `npx eslint . --max-warnings=0` both clean. Browser checks: Portrait and
  face close-up views, every face test pose, the five emotion faces, pick-up/reading/speaking poses, a full run to
  "finished", and the production build (`next start -p 3100`, head built in the worker). About 190k triangles.
- Told the user up front: an exact pixel copy of a photo is impossible in a real-time code-built model; the face
  is sculpted in code (porcelain look, not photo skin). The emotion chest light was kept as the glowing stomach core.

## What this is
A demo dashboard for the undergraduate project **"Emotion-Aware Sri Lankan Tamil Text-to-Speech Generation Using
Automatic Text-Based Emotion Prediction"** (ITC4166, University of Sri Jayewardenepura). It explains the research
pipeline visually to a supervisor and examiners. It must **not** look like an admin dashboard.

Pipeline (source of truth, do not change):
1. User enters a Sri Lankan Tamil sentence and picks a speaker: `SPK01`–`SPK04` (segmented control, never free text).
2. IndicBERT (`ai4bharat/IndicBERTv2-MLM-only`, fine-tuned) predicts a 5-class probability vector:
   `neutral, happiness, sadness, anger, fear`.
3. The **whole probability vector** (not only the top label) goes to VITS (starting checkpoint `facebook/mms-tts-tam`).
4. Inside VITS the vector is projected into an **emotion embedding**. It stays **separate** from the speaker
   embedding and conditions the text encoder, duration predictor and decoder.
5. VITS outputs a waveform. A 3D robot speaks it with lip-sync.

Models are not ready. Next.js API routes return mock data with the same JSON shape as the future Python backend.
Setting `MODEL_API_URL` makes the routes proxy to `${MODEL_API_URL}/emotion` and `/tts` instead.
Every screen that shows mock values shows a "Sample data" badge. It disappears when `source === "model"`.

## Agreed corrections to the brief (approved by the user)
- **Versions:** TypeScript 5.9 and ESLint 9 (not TS 7 / ESLint 10), because typescript-eslint supports TS < 6.1 and
  the react/import/jsx-a11y lint plugins support ESLint ≤ 9. React 19.2.8 is the version Next 16.3.8 pins.
- **Audio:** MMS-TTS Tamil outputs **16 kHz**. One frame = 256 samples = 16 ms.
- **Tokens:** IndicBERTv2 uses **WordPiece**: whole words, a `##` prefix on continuation pieces, punctuation as its
  own token, `[CLS]` = 1, `[SEP]` = 2. The UI must also accept SentencePiece `▁` tokens.
- **VITS symbols:** MMS-TTS reads **single Unicode characters** (58-symbol alphabet, punctuation dropped, blank tokens
  added between characters). `inputSymbols` are characters. The UI groups them into letters with `Intl.Segmenter`
  (`groupIntoLetters` in `src/lib/mock/tamilText.ts`).
- **No mel stage inside VITS:** the flow makes latent frames and the decoder makes the waveform directly.
  `melSpectrogram` is computed from the output audio and labelled "Spectrogram of the output voice".
- **Paper pickup:** the paper follows a grip socket in the hand each frame. Do not reparent three.js objects outside React.
- **TTS text limit:** typed input is max 300 characters (`TamilTextSchema`), but VITS receives the *normalised* text,
  which can be longer (numbers become words), so `TtsTextSchema` allows 2000.

## Workflow rules
- Work phase by phase (0–8). After each phase run `npm run build` and `npm run lint`, fix everything, summarise in
  plain simple English, list what to check in the browser, then **STOP** until the user says `continue`.
- The user wants visible progress: tick items in `PROGRESS.md` as soon as each one is done, give a short plain-English
  update between steps, and paste the checklist at every stop.
- If something in the brief is technically wrong or would hurt quality, say so first and offer a better option.

## Code conventions
- TypeScript strict, no `any`. Small components (under 200 lines where possible).
- `src/lib/api/contracts.ts` (zod) is the single source of truth for API shapes and types.
- Components never hardcode API URLs. They always go through `src/lib/api/client.ts`.
- Robot code is split by part. All joint angles and timings live in `src/components/robot/robotConstants.ts`.
- Comments only where the logic is not obvious, in simple English.
- Mock data is deterministic: the same text always gives the same result (`src/lib/mock/seeded.ts`).
- One shared `AudioContext` and `AnalyserNode` (`src/lib/audio/audioEngine.ts`). The waveform player, Play voice and
  lip-sync all use the same audio element.
- **Edit `.tsx` files in place (Edit tool), never with `sed -i`:** the running dev server's Tailwind misses
  rename-based writes and serves stale CSS (classes silently missing).
- React 19 lint rules are strict (no setState directly in an effect body, no ref reads during render). Set state from
  callbacks (ResizeObserver, rAF, timers) and mutate three.js objects only inside `useFrame` or effects.
- The `:lang(ta)` rule in `globals.css` (Anek Tamil, line-height 1.65) is **unlayered**, so it beats Tailwind
  `leading-*` / `font-*` utilities on any element inside `lang="ta"`. Give Tamil text room instead of fighting it.
- Charts follow the dataviz skill: emotion colours only for emotions (validated: CVD-safe in the fixed order; happiness
  yellow is pale on white, so every emotion mark has its name and number in text beside it), the diverging scale
  (blue below zero, gold above) for signed numbers, the sequential navy scale for amounts. Text never takes a data colour.

## Architecture as built
- `src/app/page.tsx` renders `components/stage/StageLayout.tsx` (client). One route; `stage === "idle"` shows the
  input screen, anything else shows the stage. `RobotFrame` is always the **first child** of `<main>` so the WebGL
  canvas is never rebuilt. `MotionConfig reducedMotion="user"` wraps everything.
- **Layout:** CSS grid areas. Input: `robot / form`. Stage below 1280 px: `robot / bert / vits` with the robot pinned
  under the header (`max-xl:tall:sticky`, `tall` = min-height 640px custom variant). Stage from 1280 px:
  `bert robot vits`, fixed height `100dvh - header - controls`, panels scroll inside, 40px bottom padding for the bus line.
  CSS vars in `globals.css`: `--header-h` 3.5rem, `--controls-h` 4.25rem (6.5rem under 768px), `--sticky-robot-h`.
- **Store** `src/store/pipelineStore.ts` (zustand). State: `input, speakerId, textError, speakerError, stage, emotion,
  tts, error {panel, message}, bertStep, vitsStep, mode, speed, runId, speakRequest, pendingNext, voiceBlocked, backend`.
  Actions: `setInput, setSpeaker, setMode, setSpeed, setVoiceBlocked, loadBackend, submit, advance, requestNext,
  arriveAtVits, playVoice, finishSpeaking, replay, retry, reset`. `BERT_STEP_COUNT` 10, `VITS_STEP_COUNT` 8.
- **Stage machine:** `idle` → `submit` → `understanding` (bertStep 0 shows at once; steps ≥1 need `emotion`) →
  bertStep 9 ("Send to VITS") → `handoff` (packet flies, TTS request starts with the full probability vector) →
  `arriveAtVits` → `speaking` (vitsStep 0; steps ≥1 need `tts`) → vitsStep 7 → `playing` (`speakRequest++`) →
  audio `ended` → `done`. Any API failure → `error` with the failing panel. `replay` keeps results and restarts
  (`runId++`, no API calls). `requestNext` queues (`pendingNext`) if data hasn't arrived. `reset` keeps input/speaker.
- **Director** `components/stage/usePipelineDirector.ts`: Auto-mode timers (dwell minus time already shown),
  handoff safety timeout, loads the voice when `tts` arrives, plays it `ROBOT_INTRO_MS / speed` after `playing`,
  stops audio when leaving, `ended` → `finishSpeaking`. Dwell times: `components/stage/timing.ts`.
- **SignalPath** `components/stage/SignalPath.tsx`: measures elements by `data-anchor` (`indicbert`, `vits`, `robot`,
  `bert-send` = IndicBERT step 10, `vits-inputs` = VITS step 1). Wide: a bracket "bus" under the three columns,
  trip 1 IndicBERT → VITS (packet shows 5 emotion bars), trip 2 VITS → up into the robot. Stacked: trip 1 runs down
  the left gutter. Packet uses CSS `offset-path`; reduced motion = fade at destination. Trip 1's end calls `arriveAtVits`.
- **PresenterControls**: Auto/Step, Next step (Space / →), speed 0.5×/1×/2×, Replay (R), Try another sentence
  (in the header below 768px). Keys are ignored while typing. Status line is `aria-live`, shown from 1024px.
- **UI kit** `components/ui/`: `Button` (primary / secondary / secondaryLight), `SegmentedControl` (native radios),
  `SampleDataBadge` (dark / light), `StepCard` + `stepStatus()` (pending / waiting / active / done; scrolls into view,
  again after opening; scroll margins clear the pinned robot and the bar; optional `detail` = "What the model does"
  note, `aside` = model time), `LabPanel` (white panel shell + badge), `PanelError` (Try again → `retry`).
- **Chart parts** `components/ui/`: `Heatmap` (canvas, DPR-aware, sized from the figure's outer width only so labels
  can't cause a resize loop; fixed 88px label column; row fade-in reveal with delay; hover = crosshair + lifted cell +
  readout line; touch keeps the tapped cell; `selectedRow` outline; sr-only table up to 1200 cells; gaps 2/1/0px by
  cell size), `ProbabilityBars` (5 emotion bars from a zero line, signed or 0–1 domain, `grow` entrance, values in a
  tabular column, pure so callers animate values), `BarStrip` (signed vector bars, hover dims the rest),
  `ScaleLegend` (`GradientLegend`, `SignLegend`). Helpers in `lib/`: `colorScale` (OKLab LUTs, `SIGN_COLOR`,
  `scaleGradient`, `textColorOn`), `format` (real minus sign, percent), `tokens` (`describeTokens` for `##`/`▁`,
  `groupTokensIntoWords`, `langOf`), `textDiff` (word LCS diff + Unicode-only changes), `useAnimationClock` (rAF clock
  in 1× ms, follows the speed setting live, `runKey` restarts, reduced motion = end at once).
- **Panels**: `indicbert/IndicBertPanel.tsx` maps `bertSteps.ts` (title, summary, detail) to `StepCard`s with one
  component per step in `indicbert/steps/` (`InputStep`, `NormalisationStep`, `TokensStep`, `EmbeddingsStep`,
  `EncoderStep` + `AttentionMap` (row labels are buttons; [CLS] selected first; chips shaded by attention, top 3 with %),
  `ClsVectorStep`, `LogitsStep`, `SoftmaxStep` (raw → e^score → ÷ total, Play again), `PredictionStep` (100% bar +
  list), `SendStep` (the `emotionVector` JSON + arrival status)). Heatmaps show at most 24 tokens (`steps/shared.ts`).
  After the hand-over every IndicBERT step is "done". `vits/VitsPanel.tsx` maps `vitsSteps.ts` the same way, with
  `vits/steps/` (`InputsStep` (uses `ui/EmotionColumns`), `SymbolsStep` (letters via `groupIntoLetters`, dropped
  punctuation listed), `ConditioningStep` (two lanes: speaker table lookup, 5 values → linear layer; both feed text
  encoder, duration predictor, decoder; never merged), `TextEncoderStep` (sketch, labelled as not the model's numbers),
  `DurationStep` (bars per character + 4 prosody stats), `AlignmentStep` (Heatmap big-grid mode, sweeps in from the
  left), `FlowDecoderStep` (4 stages light up, `ui/WaveformView`, mel with `flipRows`)) and `vits/AudioPlayer.tsx`.
- **AudioPlayer**: wavesurfer.js 8, imported dynamically in an effect, created with `media: audioEngine.media`,
  `url: audioEngine.voiceSource` and ready-made `peaks` (`lib/audio/wav.ts`), so it never re-fetches or resets the
  shared element (wavesurfer skips `setSrc` for the same URL and leaves external media alone on `destroy()`).
  Play voice = `audioEngine.unlock()` + `playVoice()`; Download voice saves `tts-{speaker}-{emotion}-{YYYYMMDD-HHMMSS}.wav`.
- **Heatmap big-grid mode**: `fixedHeightPx` fills the width with fractional cells drawn as one stretched image
  (`ui/heatmapDraw.ts`), `reveal="columns"`, `flipRows`. `lib/audio/wav.ts` has `decodeWav` (moved from the mock),
  `base64ToBytes`, `computePeaks`, `peaksFromBase64Wav`. `lib/mock/spectrogram.ts` exports `melBandCentreHz`.
- **Robot scene**: `components/stage/RobotFrame.tsx` (frame + status caption, dynamic import with `ssr: false`) →
  `components/robot/RobotScene.tsx` (Canvas, lights, floor + wall, baked `ContactShadows` under the desk, `CameraRig`:
  three-quarter view, steps back on narrow frames; `?debug=1` swaps it for `DebugCamera` + `DebugPanel`).
  - `robotConstants.ts`: all sizes, colours (picked from the reference image), `LIMITS`, `JOINT` names +
    `armJoint(side)` (`finger(i, segment)`, `thumb(segment)`), `REST_POSE`, `CAMERA`, `DEBUG_VIEWS` (front,
    threeQuarter, side, portrait (framed like the reference), face, paper). Units are metres; the robot faces +z,
    its left is +x.
  - `pose.ts`: `RobotPose` (spine, neck, head, gaze, lids 0 open–1 closed (upper < 0 = wide), brows raise/tilt, mouth
    open/smile/wide/round/press, armL/armR {shoulder, elbow, wrist, curl, thumb}, breath, shrug). `collectRig()`
    finds joints and the `face`/`lid-*` meshes by name once; `applyPose()` writes joints and the face's morph
    influences (indices from `MORPH_NAMES` / `LID_MORPHS`); `applyEyes()` re-writes eyes and lid morphs after the look-at.
  - `Robot.tsx` assembles waist → spine → torso + chest (breath lifts it) → neck → head, and two arms; the stomach
    core's back panel (`chest-panel`) glows in the emotion colour × voice loudness (`glowChest`). Parts in `parts/`:
    `Head` (skin mesh, `Eye` ×2, `Mouth`, `EarDisc` ×2, `ScalpSeams`), `Eye` (glossy eyeball with a painted iris that
    turns; eyelid ring mesh with blink morphs), `Mouth` (dark inside, upper teeth, lower teeth on the `jaw` group),
    `HeadDetails` (stepped ear discs, seams + screws projected onto the skin with `skinPoint`), `Neck` (segmented
    column, core, 8 glossy cables with metal rings), `Torso` (dark lathe body, bent armour plates from `PLATES`, mirrored
    with `BothSides`; slatted core over the glow panel; pistons; screws via `plateSurface`), `Arm` (shoulder cap
    dome in two pieces, ring bearing, two-piece upper-arm and forearm shells over dark cores, elbow axle + piston,
    wrist cuff; the right arm's shells are mirrored by scale), `Hand` (black palm, white back plate, 4 three-part
    fingers + three-part thumb, `grip` group unchanged at (0, −0.072, −0.026)).
  - `shapes.ts`: `armorPlate` (outline → extrude with bevel → `TessellateModifier` → bend → `toCreasedNormals`),
    `shellPiece` (thick lathe piece over part of a turn), `cable` (tube along a curve), `roundedOutline`.
  - **`face/`** (plain TS, no React, no `@/` imports): `landmarks.ts` (`FACE`: eyes, mouth, jaw hinge, ears),
    `sdf.ts` (ellipsoids stored as `Float64Array` with inverse radii, round cones, smooth union), `headSdf.ts` (the
    head sculpted from ~25 shapes; early-outs skip the face shapes at the back/top; eye bulge + almond hole),
    `eyeShape.ts` (`OPENING`, sideways `stretch` so the opening is wider than the eyeball, `eyePoint`/`eyeAngles`),
    `headMesh.ts` (`buildHeadMesh`: rays from two start points (eye level for the upper face, behind the mouth for
    the lower face, so overhangs never hide skin), false-position root finding, mouth line cut as a duplicated row,
    lips rolled inward, SDF normals, `skinPoint`), `faceMorphs.ts` (`MORPH_NAMES`: jawOpen, smile, wide, round,
    press, browRaise, browInnerUp, browDown, eyesWide; `JAW_OPEN` 0.15 rad), `skinColor.ts` (vertex colours from the
    reference: skin, lips, brows, nostrils, crease shading from the SDF, dark neck under the jaw), `eyelids.ts`
    (ring mesh around the opening, crisp edge, outer rings tuck under the skin = crease; morphs upperClose,
    lowerClose, upperWide), `headWorker.ts` + `loadHead.ts` (built once per page in a Web Worker, about 1–1.5 s;
    falls back to the main thread). The head group stays hidden until the skin arrives.
  - The arm angles in `KEY_POSES` came from the IK search; the read pose was re-solved for the lower human eye
    height (page centre y 1.135) so the face stays above the page.
  - `materials.tsx`: shared materials via context (armor, mech, cable, metal, screw, skin (vertex colours, sheen),
    eye (iris painted on a canvas), mouthInside, teeth, core (emissive)). `Desk.tsx` (desk, pad, books, lamp spotlight aimed at the paper,
    warm point light for the face). `Paper.tsx`: group named `paper` (ref passed in); Tamil drawn on a 2D canvas in
    Anek Tamil (`--font-anek-tamil` on `<html>`, after `document.fonts.load`), redrawn live from `input`. The text
    **faces the robot** (`PAPER_ON_DESK` turn + π), so from the camera it is upside down on the desk; the back
    shows the words faint and mirrored. `onLayout` reports each line's position (`LineSpot`, metres on the page).
  - React 19 lint: mutate three objects only through refs or helper functions (`glowChest`), not values from
    `useMemo`/`useState` inside the component body. Motion layers are classes held with `useState(() => new X())`;
    calling their methods inside `useFrame` passes lint.
- **Robot motion (Phase 6)**, all added together in **one `useFrame`** (`Robot.tsx` → `motionMixer.ts`):
  GSAP channels → `emotionPose` offsets → idle → lip-sync → fear tremble → `applyPose` → paper follows the hand →
  eyes aim (look-at) → lids follow the gaze + blink → `applyEyes`. A `testPose` (debug Freeze buttons) replaces it all.
  - `poseMath.ts`: `PartialPose` (deep partial, vectors whole), `addOffset`, and "channels": a pose flattened to
    `{"head.0": …, "armR.elbow": …}` so GSAP can tween it. **GSAP adds a hidden `_gsap` key to tweened objects**, so
    `channelWriter` uses a fixed path list; never loop over a channel object's keys.
  - `choreography.ts`: `Choreographer` builds one GSAP timeline per scene: `rest`, `read` (pick up if needed, then
    a repeating reading loop), `speak` (pick up quickly if needed; lower the page, eyes then head to the camera,
    breath in, `onReady`, left hand lets go to gesture), `putBack`. Every scene starts from the current values, so
    scenes interrupt each other smoothly. Besides joints it tweens `cues`: `attach` (paper desk 0 → hand 1),
    `lookPaper` + `readU/readV` (reading spot on the page), `lookCamera`, `follow` (mouse), `gesture` (free left hand).
    Parts start one after another (`MOTION.lead`: eyes 0, head 0.15 s, spine 0.24 s; shoulder → elbow → wrist → hand),
    never linear easing; wrist uses `back.out` for follow-through. timeScale = presenter speed × emotion tempo.
  - **Review changes (Phase 7):** two paper holds in `PAPER_HOLD` (`pickUp`: hand on top, from the desk; `read`:
    bottom corner, thumb on the text side, fingers behind, palm toward the robot). Cue `regrip` blends between them
    (during the lift, and back during put-back); `placePaper` lerps the hold. Wrist twist goes up to ±3.1 rad (a ball
    joint) for the read grip. Scene `think` (stage `speaking`): the right hand lowers the page (`thinkR`), the left fist
    goes under the chin (`thinkL`, fist curl 0.62), then the `THINKING` beat loop (look away, finger tap, glance at
    the page, "hmm" with pursed lips, small nod + smile) animates gaze/brows/mouth/head channels. Cue `chinRest`
    scales the emotion's head/body offsets to 0 so the chin stays on the hand. Every other scene first tweens
    `REST_FACE` back. Arm angles came from `rig2.mjs` / `rest.mjs` / `holds2.mjs` (scratchpad): FK with full fingers,
    rest = no point below the desk and fingertips 1–6 mm above it.
  - Emotion faces (`emotionPose.ts`) follow FACS: happiness = smile + cheek + parted lips; sadness = frown + inner
    brows up + heavy lids; anger = brows down + sneer + press; fear = brows up + wide eyes + stretch + open.
    `expressionLife` adds slow uneven movements (chin quiver, nose-wrinkle bursts, eye darts).
  - `useRobotTimeline.ts`: follows the store (stage → scene: understanding/handoff = read, speaking = think, playing = speak,
    done = putBack, idle/error = rest; `runId` restarts read, `speakRequest` restarts speak). `onReady` calls
    `markRobotReady(request)`. ?debug=1 "Act" buttons play scenes by hand (`DebugScene`).
  - Key poses in `robotConstants.ts` (`KEY_POSES`, `PAPER_HOLD`, `CHOREO`, `READING`, `LIP_SYNC`, `IDLE`). Arm angles
    came from a small inverse-kinematics search in Node (the joint chain rebuilt with three.js groups, pattern
    search over the 7 arm angles so `grip × PAPER_HOLD` matches a target paper transform). If body sizes change,
    redo that search; the hand meets the desk paper within 5 mm and both hands meet the reading page within 3 mm.
  - `useLipSync.ts`: shared analyser RMS → jaw (attack 40 ms, release 90 ms), adaptive peak + gate (lips fully closed
    in pauses), high/low band balance vs its running average → wide/round, press on onsets after silence, jitter;
    accents (rising past 72% of the recent peak) kick a nod spring, a hand-beat spring and a brow lift. `level` also
    drives the chest glow.
  - `useIdleMotion.ts`: blinks (80 ms close, 150 ms open, 2–6 s, sometimes double), breathing 0.25 Hz, micro-saccades,
    weight shifts, mouse follow at rest (window `pointermove`, the screen treated as a window between robot and
    viewer; looks back after 4 s idle). Reduced motion turns off saccades, weight shifts and mouse follow.
  - `emotionPose.ts`: per-emotion offsets + motion settings (tempo, gesture, sharpness, bounce, tremble), blended over
    600 ms and weighted by the **full probability vector**. Face and chest colour show the emotion only from IndicBERT
    step 9 ("Predicted emotion", `EMOTION_REVEAL_STEP`) onwards; Replay hides it again until then.
  - The voice waits for the robot: store `robotOnline` + `robotReadyFor`; the director plays when
    `robotReadyFor === speakRequest` (safety net `ROBOT_WAIT_MAX_MS`; without WebGL `ROBOT_INTRO_MS`). "Play voice"
    while speaking stops the voice until the robot is ready again. The voice packet fades into the robot on arrival.
  - `DebugPanel.tsx`: Hide / Show debug tools (hidden, not unmounted), camera views, FPS, Act (scenes), Slow motion
    (`gsap.globalTimeline.timeScale(0.25)`), Freeze (pose tests from `DebugTools.tsx`).
- **Audio** `lib/audio/audioEngine.ts`: `unlock()` inside the Read aloud click, `load(base64Wav)`, `playFromStart()`
  (false if blocked → `voiceBlocked`), `stop()`, getters `media`, `analyserNode` (fftSize 1024), `voiceSource`.
- **Mocks** `lib/mock/`: `tamilText` (graphemes, `groupIntoLetters`, `normalizeTamilText` incl. Tamil number words,
  `toModelSymbols` with pause hints, `describeChar`), `seeded`, `presets` (`PRESETS`, `findPreset`), `emotionMock`
  (WordPiece pieces, emotion cue stems, attention with [CLS] looking at cue words, CLS vector), `ttsMock` (prosody =
  probability-weighted emotion settings + speaker, durations, alignment ≤ 400 columns, embeddings, optional
  `public/mock-audio/SPK0x.wav`), `wavEncoder` (formant speech synth, `encodeWav`, `decodeWav`), `spectrogram`
  (log-mel, 80 bins, ≤ 320 frames). Delays: emotion 1.2 s, TTS 2.5 s (`lib/config.ts`).
- **API**: `lib/api/server.ts` (`parseBody` → 400, `proxyToModel` → 502 with details, adds `source: "model"` if the
  backend omits it, 30 s timeout). `lib/emotions.ts` has emotion labels, Tamil names, hex colours and bg classes.
- `examples/*.json` are request bodies for curl; `next.config.ts` sets `devIndicators: false`.

## Testing and tooling notes
- Next 16 allows only **one** `next dev` per project (lockfile). The user usually has one running (seen on
  http://localhost:3000 and 3001; check `/api/health` returns `{"backend":…}`. On 2026-10-07 port 3000 was serving a
  different project of the user's, so never assume 3000 is this app). Test against it, or `npm run build` then `node node_modules/next/dist/bin/next start -p 3100`
  (allowed alongside dev). Never kill the user's dev server.
- Browser checks: `playwright-core` driving installed Chrome (`channel: "chrome"`, args `--enable-unsafe-swiftshader
  --use-angle=swiftshader --autoplay-policy=no-user-gesture-required`). WebGL renders in software, so the first
  load takes about 30 s. Keep test scripts in the session scratchpad, not in the repo (`shots-tool/`: `shot.mjs`,
  `flow.mjs` drives a full run, `replay.mjs`, `bert.mjs` walks the IndicBERT steps with hovers, `softmax.mjs`
  captures the softmax stages at 0.5×, `norm.mjs` types a sentence with numbers, "Dr." and a decomposed vowel sign,
  `vits.mjs --url=…` walks the VITS steps, checks playback, Play voice again and the download name, `robot.mjs`
  shoots every debug angle and joint test, `face.mjs <out> <url>` the mouth shapes and the paper; Phase 6:
  `ik.mjs` + `poses.mjs` (arm-angle search), `motion.mjs <out> <url> <view> "<Act label>:<shots>,…"` plays debug
  scenes in slow motion (env `SLOW=0`, `WAIT_FIRST=ms`), `lipsync.mjs` steps a full run and shoots the face while
  speaking, `emotions.mjs` the five emotion faces, `again.mjs` Play voice again + Replay, `follow.mjs <out> <url>
  <view> [reduced]` the mouse follow). Most scripts take `--url=`; `replay.mjs <outDir> <url>`. Use
  `waitUntil: "load"`, not `networkidle`, with the robot scene. In debug screenshots press "Hide" first (the panel
  covers the head in the small input-screen frame).
  Software WebGL makes the full robot scene slow (about 5 fps, each screenshot several seconds); that is the test
  browser, not the app. Ask the user for the FPS on their GPU (`?debug=1` shows it).
  Element screenshots take about a second each in software WebGL, so time-sensitive frames drift; slow the speed.
- Tall steps: at 1280×800 a panel shows about 550px; keep a step's body within that for the 16-token presets.
- If styles look missing, dump the served CSS (`document.styleSheets`) and grep for the class before debugging layout.
- Windows: Tamil typed inline in a command line turns into `?`, so send JSON from files (`examples/`). In PowerShell use
  `curl.exe`; PowerShell eats `--`, so run `npx eslint . --max-warnings=0` directly.
- Harmless console notices: "THREE.Clock: This module has been deprecated" (inside R3F 9.8.1), and motion's
  "Reduced Motion enabled" during reduced-motion tests.

## Plan for the remaining phases
- **Phase 3, IndicBERT panel:** done (see "Panels" above). Never label anything in this panel "emotion embedding".
- **Phase 4, VITS panel:** done (see "Panels" and "AudioPlayer" above). Notes use the real mms-tts-tam config:
  6-layer text encoder, 192 hidden, 2 heads, stochastic duration predictor, 4-step flow, HiFi-GAN upsampling
  8×8×2×2 = 256, 16 kHz, 58 symbols, one speaker in the base checkpoint (speaker table + emotion lane = fine-tuning).
- **Phase 5, robot model:** done (see "Robot scene" above).
- **Phase 6, motion:** done (see "Robot motion" above).
- **Phase 7, new robot look:** done (see "Robot scene" above). Face previews were iterated with a Node script
  that imports the `face/` TS files (`node --import register.mjs --experimental-strip-types`, a resolve hook adds
  `.ts`) and a tiny software rasteriser; scratchpad only.
- **Phase 8, polish:** loading, empty and error states; keyboard; reduced motion; checks at 375/768/1280/1920; the full
  README with "How to connect the real models"; zero lint warnings.

## Design rules ("The Reading Room")
- A robot sits at a desk under a warm lamp. The "understanding" lab (IndicBERT) is on the left and the "speaking" lab
  (VITS) on the right. A gold data packet travels left, into VITS, then up into the robot.
- Palette tokens are in `src/app/globals.css` (`@theme`):
  - `ink` #0F1C33, `navy` #1B2E50, `gold` #C9A227, `panel` #FFFFFF, `mist` #E7EAF0;
  - `emotion-neutral` #8A94A6, `emotion-happiness` #E3B23C, `emotion-sadness` #4F7CAC, `emotion-anger` #C2453D,
    `emotion-fear` #7A5C99;
  - helpers: `ink-raised`, `line`, `chalk` (text on dark), `haze` (secondary on dark), `slate` (secondary on white),
    `gold-soft`, `paper` (sentence box), `alert` (error text on dark).
- Gold on white fails text contrast. Use gold for fills and accents only; text on gold uses `ink`. Error text: `alert`
  on dark, `emotion-anger` on white.
- Fonts (`next/font/google`): **Anek Tamil** for headings and every piece of Tamil text (mark it `lang="ta"`), and
  **Hind Madurai** for body text.
- No UI kits (shadcn, MUI, Chakra). No identical rounded-card grids, gradient washes, ALL-CAPS eyebrow labels,
  `→` in button text, or emojis. Numbered steps are allowed only in the step lists.
- Button text uses plain verbs: "Read aloud", "Next step", "Play voice", "Download voice", "Try another sentence".
- Respect `prefers-reduced-motion`. Visible keyboard focus everywhere: gold ring on the dark stage, navy on light panels (`.surface-light`).
- Do not use drei `<Text>` for Tamil because it doesn't shape Tamil script. Draw Tamil on a 2D canvas and use `CanvasTexture`.

## Commands
- `npm run dev`: dev server (port 3000, or the next free port)
- `npm run build`: production build (Turbopack)
- `npm run lint`: ESLint (flat config, `eslint.config.mjs`)
