"use client";

import { motion } from "motion/react";
import { useMemo } from "react";
import { cn } from "@/lib/cn";
import { groupIntoLetters } from "@/lib/mock/tamilText";
import { langOf } from "@/lib/tokens";

/** Characters in the text that the model does not read (punctuation and the like). */
function droppedCharacters(text: string, symbols: string[]): string[] {
  const read = new Set(symbols);
  const dropped = new Set<string>();
  for (const char of text.normalize("NFC").toLowerCase()) {
    if (!/\s/.test(char) && !read.has(char)) dropped.add(char);
  }
  return [...dropped];
}

/** Step 2: the characters the model reads, joined into the letters people see (நா = ந + ா). */
export function SymbolsStep({ symbols, text, speed }: { symbols: string[]; text: string; speed: number }) {
  const letters = useMemo(() => groupIntoLetters(symbols), [symbols]);
  const dropped = useMemo(() => droppedCharacters(text, symbols), [text, symbols]);
  const spaces = symbols.filter((symbol) => symbol === " ").length;
  const stagger = Math.min(0.02, 1 / Math.max(letters.length, 1));

  return (
    <div>
      <ol aria-label="Characters the model reads, grouped into letters" className="flex flex-wrap gap-x-1 gap-y-1.5">
        {letters.map((letter, index) => (
          <motion.li
            key={index}
            className="flex"
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: (index * stagger) / speed, duration: 0.25 }}
          >
            {letter.map((char, k) =>
              char === " " ? (
                <span key={k} className="flex h-8 w-5 items-center justify-center text-sm text-slate">
                  <span aria-hidden="true">␣</span>
                  <span className="sr-only">space</span>
                </span>
              ) : (
                <span
                  key={k}
                  lang={langOf(char)}
                  className={cn(
                    "flex h-8 min-w-7 items-center justify-center border border-mist bg-panel px-1.5 text-base text-navy",
                    k === 0 ? "rounded-l-md" : "-ml-px",
                    k === letter.length - 1 && "rounded-r-md",
                  )}
                >
                  {char}
                </span>
              ),
            )}
          </motion.li>
        ))}
      </ol>
      <p className="mt-2.5 text-xs text-slate">
        {symbols.length} characters ({spaces} of them spaces) in {letters.length - spaces} letters. Joined boxes are
        one letter.
        {dropped.length > 0 && (
          <>
            {" "}
            Not in the alphabet, so dropped: <span className="text-navy">{dropped.join(" ")}</span>
          </>
        )}
      </p>
    </div>
  );
}
