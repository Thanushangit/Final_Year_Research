// Runs the show: Auto mode timing, a safety net for the packet animation, and the voice playback.
import { useEffect, useRef } from "react";
import { audioEngine } from "@/lib/audio/audioEngine";
import { BERT_STEP_COUNT, VITS_STEP_COUNT, usePipelineStore } from "@/store/pipelineStore";
import { BERT_DWELL_MS, PACKET_MS, ROBOT_INTRO_MS, ROBOT_WAIT_MAX_MS, VITS_DWELL_MS } from "./timing";

export function usePipelineDirector(): void {
  const mode = usePipelineStore((s) => s.mode);
  const speed = usePipelineStore((s) => s.speed);
  const stage = usePipelineStore((s) => s.stage);
  const bertStep = usePipelineStore((s) => s.bertStep);
  const vitsStep = usePipelineStore((s) => s.vitsStep);
  const emotion = usePipelineStore((s) => s.emotion);
  const tts = usePipelineStore((s) => s.tts);
  const runId = usePipelineStore((s) => s.runId);
  const speakRequest = usePipelineStore((s) => s.speakRequest);
  const robotOnline = usePipelineStore((s) => s.robotOnline);
  const robotReadyFor = usePipelineStore((s) => s.robotReadyFor);
  const revealedAt = useRef(0);
  const startedFor = useRef(0);

  // Remember when the current step appeared, so Auto mode waits the right amount of time
  // even when the step was shown before the model's answer arrived.
  useEffect(() => {
    revealedAt.current = performance.now();
  }, [bertStep, vitsStep, runId]);

  // Auto mode: show the next step once the current one has been on screen long enough.
  useEffect(() => {
    if (mode !== "auto") return;
    const inBert = stage === "understanding" && emotion !== null && bertStep < BERT_STEP_COUNT - 1;
    const inVits = stage === "speaking" && tts !== null && vitsStep < VITS_STEP_COUNT - 1;
    if (!inBert && !inVits) return;
    const dwell = (inBert ? BERT_DWELL_MS[bertStep] : VITS_DWELL_MS[vitsStep]) / speed;
    const wait = Math.max(0, dwell - (performance.now() - revealedAt.current));
    const timer = window.setTimeout(() => usePipelineStore.getState().advance(), wait);
    return () => window.clearTimeout(timer);
  }, [mode, stage, bertStep, vitsStep, emotion, tts, speed]);

  // Safety net: if the packet animation never reports back, arrive anyway.
  useEffect(() => {
    if (stage !== "handoff") return;
    const timer = window.setTimeout(
      () => usePipelineStore.getState().arriveAtVits(),
      PACKET_MS / usePipelineStore.getState().speed + 2000,
    );
    return () => window.clearTimeout(timer);
  }, [stage, runId]);

  // Load the voice as soon as VITS answers, so it is ready to play.
  useEffect(() => {
    if (tts) audioEngine.load(tts.audio.base64Wav);
  }, [tts]);

  // Speaking: the robot looks up and breathes in (picking the paper up first if it was put down), then
  // says it is ready and the voice starts. Without the 3D robot, a short pause stands in for that.
  useEffect(() => {
    if (stage !== "playing" || !tts || startedFor.current === speakRequest) return;
    audioEngine.stop(); // "Play voice" again while speaking: quiet until the robot is ready again
    const ready = robotReadyFor === speakRequest;
    const wait = ready ? 0 : (robotOnline ? ROBOT_WAIT_MAX_MS : ROBOT_INTRO_MS) / usePipelineStore.getState().speed;
    let cancelled = false;
    const timer = window.setTimeout(async () => {
      startedFor.current = speakRequest;
      const played = await audioEngine.playFromStart();
      if (!cancelled) usePipelineStore.getState().setVoiceBlocked(!played);
    }, wait);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [stage, speakRequest, tts, robotOnline, robotReadyFor]);

  // Leaving the speaking part (replay or a new sentence) silences the voice.
  useEffect(() => {
    if (stage !== "playing" && stage !== "done") audioEngine.stop();
  }, [stage]);

  // When the voice ends, the run is done.
  useEffect(() => {
    const media = audioEngine.media;
    const onEnded = () => usePipelineStore.getState().finishSpeaking();
    media.addEventListener("ended", onEnded);
    return () => media.removeEventListener("ended", onEnded);
  }, []);
}
