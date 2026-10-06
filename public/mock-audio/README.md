# Optional sample voices

Put real recordings here named `SPK01.wav`, `SPK02.wav`, `SPK03.wav`, `SPK04.wav`
(16-bit PCM WAV, mono, ideally 16 kHz).

When a file exists, the mock `/api/tts` route returns it for that speaker instead of the generated
placeholder voice. When it doesn't exist, a speech-like placeholder is generated so lip-sync can still be tested.
