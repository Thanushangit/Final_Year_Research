import { toGraphemes } from "@/lib/mock/tamilText";

/** Step 1: the sentence as typed, with a count of words, letters and Unicode characters. */
export function InputStep({ text }: { text: string }) {
  const words = text.split(/\s+/).filter(Boolean).length;
  const letters = toGraphemes(text).filter((part) => /\p{L}/u.test(part)).length;
  const characters = Array.from(text.replace(/\s/g, "")).length;

  return (
    <div>
      <p lang="ta" className="rounded-r-md border-l-4 border-gold bg-paper px-4 py-2.5 text-xl text-navy">
        {text}
      </p>
      <p className="mt-2 text-xs text-slate">
        {words} words · {letters} letters · {characters} Unicode characters (not counting spaces)
      </p>
    </div>
  );
}
