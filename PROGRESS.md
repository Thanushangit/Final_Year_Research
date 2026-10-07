# Progress

`[x]` = done, `[ ]` = not done yet. Claude ticks each item as soon as it is finished.

**Now:** All phases are done (0–9). Waiting for your final check.

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

### Phase 7 — New robot look (realistic android, from your reference image)
- [x] Study the reference image closely (proportions, plates, joints, colours, face)
- [x] Head: realistic bald human face (sculpted in code), real-looking eyes and eyelids, lips that still lip-sync, scalp seams, black ear discs
- [x] Neck: black mechanical neck with cables and a segmented column
- [x] Torso: white armour plates (collar, chest, stomach), black core with glowing slats (emotion colour)
- [x] Arms: big round shoulder caps, black joint discs, white upper-arm and forearm shells, black elbows
- [x] Hands: four fingers and a thumb, three segments each, black knuckles
- [x] Every Phase 6 action still works (pick up, read, speak, lip-sync, blink, emotions, put back)
- [x] Build + lint + screenshots (portrait, face close-up, every face movement, five emotions, pick-up, reading, speaking, a full run, the production build)
- [x] First review: you checked it and sent changes

**Phase 7 changes from your review**
- [x] Cheeks and jaw: fuller cheeks (no hollows under the eyes) and a strong square jaw, like `public/Robot.png`
- [x] More human facial actions for each emotion
- [x] Hands resting on the desk look natural (fingers visible, not sinking into the desk)
- [x] Paper grip: thumb in front of the page, four fingers behind it, page colour easy to tell apart from the fingers
- [x] After the packet reaches VITS: one hand holds the page, the other hand makes a thinking gesture (hand to chin)
- [x] While the voice is being made: natural small movements and facial reactions
- [x] Build + lint + screenshots
- [x] Second review: you sent close-up crops of the reference (face, head panels, hand, shoulder)

**Phase 7 changes from your second review (close-up crops)**
- [x] Compare each part with the crops and list the differences
- [x] Face: soft low brows, deep-set eyes with lid creases, straight narrow nose, thin upper lip with a clear cupid's bow
- [x] Head: wider, squarer skull and jaw; raised side plates from the crown down to the ear discs, with seams and screws; the face plate's edge along the jaw
- [x] Hands: segmented white plates on the back of the hand, big black rounded knuckle joints, chunkier finger segments
- [x] Shoulders: two-piece cap with a seam, black ring bearing and mechanics underneath
- [x] Build + lint + screenshots
- [x] STOP: you checked it ("almost correct") and moved on to the layout

### Phase 8 — Robot-first stage layout with sliding process screens
- [x] Stage screen shows only the robot, full screen; "IndicBERT Process" button bottom-left, "VITS Process" button bottom-right
- [x] Flow line on the robot screen: IndicBERT → VITS → Robot, with the current process clearly marked
- [x] IndicBERT screen slides in over the whole screen; its 10 steps laid out with clear arrows and animations
- [x] "Back to robot" button + Esc on both screens (steps first waited for you to open a screen; later changed, as you asked, to run in the background)
- [x] After step 10 the screen slides back by itself and the packet travels to the VITS button
- [x] VITS screen slides in from the right; its 8 steps with clear arrows; when done it slides back and the robot speaks
- [x] Existing panel content unchanged (laptop only: no phone/tablet work, as you asked)
- [x] Build + lint + screenshots (full run at 1440 px reached "Finished")
- [x] STOP: you checked it ("fine") and asked for Phase 9

**Phase 8 extra: bright study room behind the robot (from your `study_table_with_robot.png` reference)**
- [x] Brighter, warmer room: beige walls, oak floor, warmer lights (the old dark navy room is gone)
- [x] Walnut bookshelf behind the robot with warm lights under each shelf, rows of books, globe, marble bust, small plant, framed photo
- [x] Left side: bright window, framed picture on the wall, big leafy plant on a low cabinet
- [x] Black office chair behind the robot
- [x] Desk: titled book stack (Artificial Intelligence, Robotics, Speech Synthesis, Natural Language Processing), black mug on a coaster, laptop with a voice waveform, pen cup, leather notebook, sticky notes, small plant; black desk lamp
- [x] Free CC0 models from Poly Haven in `public/models/` (plants, bust, picture frames, about 3 MB); everything else built in code
- [x] Fixes after the first screenshot: frame glass hidden (it showed black), globe and bust moved into view
- [x] Rebuild + screenshot to confirm those fixes (photos, globe and bust now show)
- [x] Chair replaced with a navy leather executive chair like your chair reference (tall back with stitched channels, lumbar band, padded armrests on metal supports)
- [x] Flow arrows (IndicBERT → VITS, VITS → robot) show only while a signal is travelling, then fade away
- [x] IndicBERT and VITS steps run in the background after Read aloud (Auto mode), even if you never open their screens; the buttons only open a screen to watch
- [x] The step row at the top of both screens scrolls by itself to keep the current step in view; a finished screen opens at its last step
- [x] You check it in the browser

### Phase 9 — Polish and handover
- [x] Loading, empty and error states with clear messages (new: when a model fails, the robot screen shows the message with Try again and Try another sentence; checked with a backend that doesn't exist)
- [x] Keyboard (Enter, Space, →, R, Esc), focus rings, reduced-motion support (checked: a full run with reduced motion reaches "Finished")
- [x] Full `README.md` including "How to connect the real models", the API contract, and screenshots of the main screens (`docs/screenshots/`)
- [x] `CLAUDE.md` updated (status, new layout, process screens, study room, chair, arrows, background running)
- [x] Final build with 0 errors and 0 lint warnings
- [x] Final build with 0 errors and 0 lint warnings
- [x] STOP: you check the final version
