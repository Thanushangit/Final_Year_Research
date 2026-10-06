"use client";

import { useEffect, useRef, useState } from "react";

interface WaveformViewProps {
  /** Loudness peaks from 0 to 1, left to right. */
  peaks: number[];
  /** How much is drawn, from 0 (nothing) to 1 (all), left to right. */
  progress: number;
  heightPx?: number;
  className?: string;
}

/** A still picture of a waveform: mirrored bars, drawn on a canvas, sweeping in from the left. */
export function WaveformView({ peaks, progress, heightPx = 56, className }: WaveformViewProps) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [width, setWidth] = useState(0);

  useEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap) return;
    const observer = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width));
    observer.observe(wrap);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context || width === 0 || peaks.length === 0) return;
    const ratio = window.devicePixelRatio || 1;
    canvas.width = Math.round(width * ratio);
    canvas.height = Math.round(heightPx * ratio);
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    context.clearRect(0, 0, width, heightPx);
    const loudest = Math.max(1e-6, ...peaks);
    const bars = Math.min(peaks.length, Math.floor(width / 3));
    const step = width / bars;
    const middle = heightPx / 2;
    context.fillStyle = "#1b2e50";
    for (let i = 0; i < bars * progress; i++) {
      const peak = peaks[Math.floor((i * peaks.length) / bars)] / loudest;
      const half = Math.max(0.5, peak * (middle - 1));
      context.fillRect(i * step, middle - half, Math.max(1, step - 1), half * 2);
    }
  }, [peaks, progress, width, heightPx]);

  return (
    <div ref={wrapRef} className={className}>
      <canvas ref={canvasRef} aria-hidden="true" className="block w-full" style={{ height: heightPx }} />
    </div>
  );
}
