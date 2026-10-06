import type { StepMeta } from "@/components/ui/StepCard";

/** The eight VITS steps, in order. Facts follow the facebook/mms-tts-tam config (16 kHz, 58 symbols). */
export const VITS_STEPS: readonly StepMeta[] = [
  {
    title: "Three inputs",
    summary: "The sentence, the speaker, and the emotion probabilities from IndicBERT.",
    detail:
      "VITS receives three things: the normalised sentence, the chosen speaker ID, and IndicBERT's five probabilities. They arrive as plain values. Nothing has been turned into a vector yet; that happens in step 3.",
  },
  {
    title: "Text to symbols",
    summary: "The model reads Tamil one character at a time.",
    detail:
      "MMS-TTS Tamil reads single Unicode characters from a fixed alphabet of 58 symbols, so the letter நா is read as ந and then ா. Punctuation is not in the alphabet and is dropped. Before encoding, a blank symbol is slipped between every pair of characters, which makes it easier for the model to line sounds up.",
  },
  {
    title: "Conditioning",
    summary: "The speaker and the emotion each become their own vector. They stay separate.",
    detail:
      "The speaker embedding is one row looked up from a learned table, one row per speaker. The emotion embedding is made by a learned linear layer from the five probabilities, so a mixed feeling gives a mixed vector. Both go to the text encoder, the duration predictor and the decoder, but they are never merged into one vector. The original MMS-TTS Tamil model has one voice and no emotion input; both lanes come from this project's fine-tuning. The bars show the first 16 numbers of each vector.",
  },
  {
    title: "Text encoder",
    summary: "Each character becomes a hidden vector that describes its sound.",
    detail:
      "A transformer with 6 layers and 2 attention heads turns each character into a hidden vector of 192 numbers that describes how it should sound in this sentence. From these vectors it also predicts, for each character, the average and the spread of the sound features to come. The speaker and emotion vectors are given to it as extra conditions.",
  },
  {
    title: "Duration predictor",
    summary: "How many frames each character lasts. The feeling changes the pace.",
    detail:
      "A stochastic duration predictor guesses how many frames each character lasts. One frame is 256 samples, which is 16 ms at 16,000 samples per second. Because it is conditioned on the emotion, a sad sentence gets longer durations and a slower pace. The four numbers below sum up the result: pace, average pitch, how much the pitch moves, and loudness.",
  },
  {
    title: "Alignment",
    summary: "The characters are stretched across time to match those durations.",
    detail:
      "Each character is held for as many frames as its duration says. The result is this alignment: time runs left to right, characters run top to bottom, and every frame belongs to exactly one character. Speech never goes backwards, so the path only moves down and to the right. During training VITS finds this path by itself (monotonic alignment search); when speaking it builds it from the predicted durations.",
  },
  {
    title: "Flow and decoder",
    summary: "The flow shapes latent frames, and the decoder turns them straight into a waveform.",
    detail:
      "The character features are stretched along the alignment and sampled, with a little randomness, into latent frames of 192 numbers. A flow of 4 reversible steps reshapes them into the form the decoder expects. The decoder (HiFi-GAN style) upsamples each frame by 8 × 8 × 2 × 2 = 256 samples and writes the waveform directly. VITS never makes a mel-spectrogram on the way: the spectrogram here is computed from the finished voice, so you can see its sound.",
  },
  {
    title: "Output voice",
    summary: "Listen to the voice, or download it.",
    detail:
      "The finished voice is a mono WAV file at the model's sample rate. The waveform cursor, Play voice and the robot's lips all use the same sound, so they always stay in step.",
  },
];
