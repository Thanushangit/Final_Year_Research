"use client";

import { motion } from "motion/react";
import type { FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import { audioEngine } from "@/lib/audio/audioEngine";
import { usePipelineStore } from "@/store/pipelineStore";
import { SamplePresets } from "./SamplePresets";
import { SentenceInput } from "./SentenceInput";
import { SpeakerSelect } from "./SpeakerSelect";

/** The input screen: write a sentence, pick a speaker, read it aloud. */
export function InputForm() {
  const submit = usePipelineStore((s) => s.submit);

  const readAloud = (event?: FormEvent) => {
    event?.preventDefault();
    // Unlock sound now, while we are inside the user's click or key press.
    audioEngine.unlock();
    void submit();
  };

  return (
    <motion.form
      noValidate
      onSubmit={readAloud}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8, transition: { duration: 0.2 } }}
      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      className="flex flex-col gap-7 [grid-area:form]"
    >
      <SentenceInput onSubmit={() => readAloud()} />
      <SpeakerSelect />
      <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <SamplePresets />
        <Button type="submit" variant="primary" size="lg" className="w-full lg:w-auto">
          Read aloud
        </Button>
      </div>
    </motion.form>
  );
}
