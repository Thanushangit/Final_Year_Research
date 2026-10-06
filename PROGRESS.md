# Progress

`[x]` = done, `[ ]` = not done yet. Claude ticks each item as soon as it is finished.

**Now:** Phase 6 is finished. Waiting for you to check it in the browser and reply `continue` (next: Phase 7, polish and README).

---

### Planning
- [x] Read the spec file
- [x] Check tools on this PC: Node 22.13.1, npm 11.7.0, git 2.47, Edge + Chrome installed
- [x] Check the newest package versions and which ones work together
- [x] Check the real model settings on Hugging Face (MMS-TTS Tamil, IndicBERTv2)
- [x] Write the plan
- [x] You approve the plan

### Phase 0 — Setup
- [x] Create the Next.js 16.3.8 app (TypeScript, Tailwind 4, ESLint, App Router, `src/`)
- [x] Install the 3D, animation, state, validation and audio packages
- [x] Create the folder structure, `CLAUDE.md`, `.env.example`, `PROGRESS.md`, first `README.md`
- [x] Theme colours + Anek Tamil / Hind Madurai fonts + a simple page to check them
- [x] `npm run build` and `npm run lint` pass with no errors
- [x] STOP: you check in the browser and reply `continue`

### Phase 1 — Contracts, mocks, API routes, store
- [x] `contracts.ts` (zod schemas + types)
- [x] Mock data: `seeded.ts`, `presets.ts`, `emotionMock.ts`, `ttsMock.ts`, `wavEncoder.ts`
- [x] `/api/emotion`, `/api/tts`, `/api/health` with mock/real switch (400 and 502 errors)
- [x] `pipelineStore.ts` (zustand)
- [x] Test with `curl`, and show you the commands
- [x] Build + lint pass
- [x] STOP: you check it and reply `continue`

### Phase 2 — Input screen, stage layout, presenter controls
- [x] Input screen: Tamil text box, speaker buttons, 5 sample sentences, "Read aloud"
- [x] Stage screen: 3 columns (stacked on tablet/phone)
- [x] Step-by-step runner (emotion call, then IndicBERT steps, packet, TTS call, VITS steps, voice)
- [x] Presenter controls: Auto/Step, Next step (Space / →), speed, Replay, Try another sentence
- [x] Gold packet animation (`SignalPath`); placeholder box for the robot
- [x] Shared parts moved here from phase 3: `SampleDataBadge`, `StepCard`, plus the shared audio engine (so the voice plays)
- [x] Build + lint + screenshots (1440, 1280, 768 and 375 px; Auto, Step, reduced motion, Replay)
- [x] STOP: you check it in the browser and reply `continue`

### Phase 3 — IndicBERT panel "Understanding" (10 steps)
- [x] Check the five emotion colours with the colour-blindness checker (they stay distinct; names and numbers always shown too)
- [x] Shared parts: chart colours, `Heatmap`, `ProbabilityBars`, `BarStrip`, "What the model does" notes in `StepCard`
- [x] Steps 1–3: input sentence, normalisation before/after, token chips with IDs
- [x] Steps 4–6: embeddings heatmap, 12 layers + attention map (hover a token), [CLS] bar strip
- [x] Steps 7–10: logits, softmax animation, predicted emotion + full vector, send to VITS
- [x] Build + lint + screenshots (1440, 1280 and 375 px; Step mode, reduced motion, Replay, a typed sentence with numbers)
- [x] STOP: you check it in the browser and reply `continue`

### Phase 4 — VITS panel "Speaking" (8 steps)
- [x] Shared parts: "What the model does" notes for VITS, `Heatmap` fast drawing for big grids (alignment, spectrogram)
- [x] Steps 1–3: three inputs (5 mini bars), character chips grouped into letters, two separate conditioning lanes
- [x] Steps 4–6: text encoder, durations + prosody numbers, alignment with the diagonal drawing in
- [x] Step 7: flow → latent frames → decoder → waveform, with "Spectrogram of the output voice"
- [x] Step 8: `AudioPlayer` (waveform, Play voice, Download voice, duration, sample rate) on the shared `audioEngine`
- [x] Build + lint + screenshots (1440, 1280 and 375 px; Step and Auto mode, reduced motion, Replay, download)
- [x] STOP: you check it in the browser and reply `continue`

### Phase 5 — 3D robot model and scene
- [x] Robot "skeleton": named joints, a resting pose, and one function that moves every joint (ready for Phase 6)
- [x] Head: rounded head, face plate, eyes with iris + pupil + eyelids, eyebrows, upper and lower lips + jaw
- [x] Body: neck, torso, chest panel glowing in the emotion colour
- [x] Arms with shoulder/elbow/wrist; hands with thumb + 3 two-part fingers
- [x] Desk, lamp light, soft shadows, paper with the Tamil sentence drawn on it
- [x] `?debug=1`: 3 camera angles (+ face and paper close-ups), orbit controls, FPS meter, test buttons (blink, mouth, smile, fingers)
- [x] Build + lint + screenshots from 3 angles (plus face and paper close-ups, the stage at 1440 and 375 px, reduced motion)
- [x] STOP: you check it in the browser and reply `continue`

### Phase 6 — Robot movement, lip-sync, natural motion
- [x] Choreography: look down, reach, grip, lift, read, look up, speak, put paper back
- [x] Lip-sync from the playing audio (jaw, round/wide lips, closed in pauses)
- [x] Idle life: blinking, breathing, eye movements, follows the mouse, weight shifts
- [x] Emotion poses + chest light colour; Play voice again makes the robot speak again
- [x] Build + lint + screenshots (each scene in slow motion, reading eyes, lip-sync in a full run, five emotion faces, Play voice again, Replay, mouse follow, reduced motion, 1440 and 375 px)
- [x] STOP: you check it in the browser and reply `continue`

### Phase 7 — Polish and handover
- [ ] Loading, empty and error states with clear messages
- [ ] Keyboard (Enter, Space, →, R), focus rings, reduced-motion support
- [ ] Full `README.md` including "How to connect the real models"
- [ ] Final build with 0 errors and 0 lint warnings, then STOP
