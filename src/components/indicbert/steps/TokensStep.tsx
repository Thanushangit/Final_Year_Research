"use client";

import { motion } from "motion/react";
import { useMemo } from "react";
import type { Token } from "@/lib/api/contracts";
import { cn } from "@/lib/cn";
import { describeTokens, groupTokensIntoWords, type TokenView } from "@/lib/tokens";
import { TokenText } from "../TokenText";

interface ChipProps {
  view: TokenView;
  id: number;
  /** Pieces of one word sit side by side as one joined block. */
  first: boolean;
  last: boolean;
  delay: number;
}

function TokenChip({ view, id, first, last, delay }: ChipProps) {
  const special = view.kind === "special";
  return (
    <motion.span
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
      className={cn(
        "flex flex-col items-center border px-2 pt-0.5 pb-1",
        special && "relative z-[1] border-gold bg-gold text-ink",
        view.kind === "punctuation" && "border-mist bg-mist/70 text-navy",
        !special && view.kind !== "punctuation" && "border-mist bg-panel text-navy",
        first ? "rounded-l-md" : "-ml-px",
        last && "rounded-r-md",
      )}
    >
      <TokenText view={view} className="text-sm" />
      <span className={cn("text-[10px] leading-none tabular-nums", special ? "text-ink" : "text-slate")}>
        <span className="sr-only">ID </span>
        {id}
      </span>
    </motion.span>
  );
}

/** Step 3: the word pieces the model reads, each with its ID; [CLS] and [SEP] in gold. */
export function TokensStep({ tokens, speed }: { tokens: Token[]; speed: number }) {
  const views = useMemo(() => describeTokens(tokens.map((token) => token.token)), [tokens]);
  const groups = useMemo(() => groupTokensIntoWords(views), [views]);
  const stagger = Math.min(0.035, 1.2 / tokens.length);
  const pieces = views.filter((view) => view.kind === "word" || view.kind === "piece").length;
  const punctuation = views.filter((view) => view.kind === "punctuation").length;
  const specials = views.filter((view) => view.kind === "special").map((view) => view.text);

  return (
    <div>
      <ol aria-label="Tokens in order, with their ID numbers" className="flex flex-wrap gap-x-1.5 gap-y-2">
        {groups.map((group) => (
          <li key={group[0]} className="flex">
            {group.map((index, k) => (
              <TokenChip
                key={index}
                view={views[index]}
                id={tokens[index].id}
                first={k === 0}
                last={k === group.length - 1}
                delay={(index * stagger) / speed}
              />
            ))}
          </li>
        ))}
      </ol>
      <p className="mt-2.5 text-xs text-slate">
        {tokens.length} tokens: {pieces} word pieces
        {punctuation > 0 && `, ${punctuation} punctuation`}
        {specials.length > 0 && `, plus ${specials.join(" and ")}`}.
        {views.some((view) => view.marker === "##") && " ## means the piece joins the one before it."}
        {views.some((view) => view.marker === "▁") && " ▁ marks the start of a word."}
      </p>
    </div>
  );
}
