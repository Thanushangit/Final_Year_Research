"use client";

import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { SPEAKER_IDS } from "@/lib/api/contracts";
import { usePipelineStore } from "@/store/pipelineStore";

const OPTIONS = SPEAKER_IDS.map((id) => ({ value: id, label: id }));

/** The four Jaffna Tamil speakers the model was trained on. */
export function SpeakerSelect() {
  const speakerId = usePipelineStore((s) => s.speakerId);
  const setSpeaker = usePipelineStore((s) => s.setSpeaker);
  const error = usePipelineStore((s) => s.speakerError);
  return (
    <SegmentedControl label="Speaker" options={OPTIONS} value={speakerId} onChange={setSpeaker} error={error} />
  );
}
