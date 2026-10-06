# Reading Room: Emotion-Aware Sri Lankan Tamil TTS demo

A demo dashboard for the research project **Emotion-Aware Sri Lankan Tamil Text-to-Speech Generation Using Automatic
Text-Based Emotion Prediction** (ITC4166, University of Sri Jayewardenepura).

IndicBERT reads a Sri Lankan Tamil sentence and predicts how it feels (neutral, happiness, sadness, anger, fear).
VITS then speaks the sentence with that feeling, and a 3D robot reads it aloud with lip-sync.

> This README grows phase by phase. The full version, including the API contract and
> "How to connect the real models", is written in phase 7. See `PROGRESS.md` for the current status.

## Run it

Needs Node.js 20.9 or newer (tested with Node 22).

```bash
npm install
npm run dev
```

Open http://localhost:3000.

## Sample data vs real models

The models are not ready yet, so the API routes return realistic sample data. To use the real Python backend later,
copy `.env.example` to `.env.local` and set `MODEL_API_URL` (for example `http://localhost:8000`).

## Try the API

The routes return sample data until `MODEL_API_URL` is set. Example request bodies are in `examples/`.
Send the JSON from a file, because on Windows any Tamil typed straight into a command line turns into `?`.
Use the port that `npm run dev` prints (3000 by default).

```bash
# Sample data ("mock") or the real models ("model")?
curl http://localhost:3000/api/health

# IndicBERT: sentence in, emotion probabilities out
curl -X POST http://localhost:3000/api/emotion -H "Content-Type: application/json" --data-binary "@examples/emotion-request.json"

# VITS: sentence + speaker + full emotion vector in, voice out
curl -X POST http://localhost:3000/api/tts -H "Content-Type: application/json" --data-binary "@examples/tts-request.json"

# A bad request (English text) gets HTTP 400 with a clear message
curl -i -X POST http://localhost:3000/api/emotion -H "Content-Type: application/json" --data-binary "@examples/bad-request.json"
```

In Windows PowerShell, type `curl.exe` instead of `curl` (there, `curl` means a different command).

To hear the sample voice, save it as a WAV file (PowerShell):

```powershell
$r = Invoke-RestMethod -Method Post -Uri http://localhost:3000/api/tts -ContentType "application/json" -InFile examples/tts-request.json
[IO.File]::WriteAllBytes("$PWD\voice.wav", [Convert]::FromBase64String($r.audio.base64Wav))
```

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Start the dev server |
| `npm run build` | Production build |
| `npm run start` | Run the production build |
| `npm run lint` | Check the code with ESLint |
