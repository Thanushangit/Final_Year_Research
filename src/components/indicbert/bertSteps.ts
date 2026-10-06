import type { StepMeta } from "@/components/ui/StepCard";

/** The ten IndicBERT steps, in order. Never call anything in this panel an "emotion embedding": that is made inside VITS. */
export const BERT_STEPS: readonly StepMeta[] = [
  {
    title: "Input sentence",
    summary: "The Tamil sentence, exactly as it was typed.",
    detail:
      "Nothing is calculated yet. A computer stores Tamil as Unicode characters, not as letters: the letter நா is two characters, ந and the vowel sign ா. This is the text before any clean-up.",
  },
  {
    title: "Normalisation",
    summary: "Clean the text: one Unicode form, and numbers and short forms written out in words.",
    detail:
      "Unicode can store some Tamil vowel signs in two ways: ொ can be one character, or ெ followed by ா. NFC normalisation picks one standard form, so the same word always becomes the same tokens. Invisible characters and extra spaces are removed, and numbers and short forms are written out in words (10 becomes பத்து), because the speech model will have to say them aloud later.",
  },
  {
    title: "Tokenisation",
    summary: "Split the sentence into word pieces the model knows. Each piece has an ID number.",
    detail:
      "IndicBERT v2 has a WordPiece vocabulary of 250,000 pieces, shared by 23 Indian languages and English. Common words stay whole. Rarer words are cut into a known start plus pieces marked ##, which join on to the piece before them. [CLS] (ID 1) is added at the start and [SEP] (ID 2) at the end.",
  },
  {
    title: "Token embeddings",
    summary: "Each token becomes a list of 768 numbers.",
    detail:
      "Each ID picks one row from a learned table that has 768 numbers for every piece in the vocabulary. A position vector is added, so the model knows the order of the tokens. The colours show the first 16 of the 768 numbers: blue below zero, gold above zero.",
  },
  {
    title: "Transformer encoder",
    summary: "Twelve layers let every token look at every other token to understand the context.",
    detail:
      "There are 12 layers, one after another. In each layer, 12 attention heads score how much every token should look at every other token, then mix the tokens' numbers using those scores. A small feed-forward network then updates each token. After 12 layers, each token's numbers carry the meaning of the whole sentence around it. The map shows the last layer, averaged over its 12 heads: each row is one token, and the squares across it show how much that token looks at every token, in the same order. Each row adds up to 1.",
  },
  {
    title: "Sentence representation",
    summary: "The [CLS] token's vector now sums up the whole sentence.",
    detail:
      "[CLS] is not a word, so it has nothing of its own to describe. After 12 layers of looking at the other tokens, its 768 numbers have become a summary of the whole sentence. This one vector is all the classifier reads.",
  },
  {
    title: "Classification head",
    summary: "A small layer turns those 768 numbers into one score per emotion.",
    detail:
      "A linear layer: each of the 5 scores is a weighted sum of the 768 numbers, plus a bias. Its weights were learned during fine-tuning on labelled Sri Lankan Tamil sentences. Raw scores like these are called logits. Bigger means more likely, but they are not probabilities yet.",
  },
  {
    title: "Softmax",
    summary: "The scores become probabilities that add up to 1.",
    detail:
      "Softmax raises e to the power of each score, which makes every value positive, then divides each one by their total. The order never changes, so the highest score stays the highest, but now the five values add up to 1 and can be read as probabilities.",
  },
  {
    title: "Predicted emotion",
    summary: "The most likely feeling, and how sure the model is.",
    detail:
      "The prediction is simply the largest of the five probabilities, and the confidence is that probability. The label is for people to read. The speech model gets all five numbers, so a sentence that is mostly sad but a little afraid can sound that way.",
  },
  {
    title: "Send to VITS",
    summary: "All five probabilities travel to the speech model, not only the top one.",
    detail:
      "The five probabilities travel to VITS together with the normalised sentence and the chosen speaker. Inside VITS, a small linear layer turns the five numbers into the vector that steers the voice (Speaking, step 3).",
  },
];
