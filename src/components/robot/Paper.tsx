"use client";

// The sheet of paper. The Tamil sentence is drawn on a 2D canvas (the browser shapes Tamil correctly
// there; drei's <Text> does not) and used as the paper's texture. The text faces the robot, so it can
// read it; the back shows the words faintly in mirror image, like thin paper held up to a lamp.
import { useEffect, useRef, type Ref } from "react";
import { CanvasTexture, SRGBColorSpace, type Group, type MeshStandardMaterial } from "three";
import { COLORS, ROOM } from "./robotConstants";

const WIDTH = 1024;
const HEIGHT = Math.round((WIDTH * ROOM.paper.size[1]) / ROOM.paper.size[0]);
const MARGIN = 84;
const LINE = 66;
const FIRST_LINE = 150;
const FONT_SIZE = 50;

/** Lying on the desk, text up, the top of the page pointing away from the robot. */
export const PAPER_ON_DESK: { position: [number, number, number]; rotation: [number, number, number] } = {
  position: [...ROOM.paper.position],
  rotation: [-Math.PI / 2, 0, ROOM.paper.turn + Math.PI],
};

/** One line of text on the page, in metres from the page centre (+u = page right, +v = page top). */
export interface LineSpot {
  v: number;
  uStart: number;
  uEnd: number;
}

const toU = (px: number) => (px / WIDTH - 0.5) * ROOM.paper.size[0];
const toV = (py: number) => (0.5 - py / HEIGHT) * ROOM.paper.size[1];

/** The font family next/font registered for Anek Tamil (it has a generated name). */
function anekTamilFamily(): string {
  const family = getComputedStyle(document.documentElement).getPropertyValue("--font-anek-tamil").trim();
  return family || "'Anek Tamil', sans-serif";
}

/** Breaks text into lines that fit the page, by whole words. */
function wrap(context: CanvasRenderingContext2D, text: string, width: number): string[] {
  const lines: string[] = [];
  let line = "";
  for (const word of text.split(/\s+/).filter(Boolean)) {
    const next = line ? `${line} ${word}` : word;
    if (line && context.measureText(next).width > width) {
      lines.push(line);
      line = word;
    } else {
      line = next;
    }
  }
  if (line) lines.push(line);
  return lines;
}

function setUp(canvas: HTMLCanvasElement, family: string): CanvasRenderingContext2D | null {
  const context = canvas.getContext("2d");
  if (!context) return null;
  context.setTransform(1, 0, 0, 1, 0, 0);
  context.globalAlpha = 1;
  context.fillStyle = COLORS.paper;
  context.fillRect(0, 0, WIDTH, HEIGHT);
  context.font = `500 ${FONT_SIZE}px ${family}`;
  context.textBaseline = "alphabetic";
  return context;
}

/** The lines that fit on the page (the last one gets "…" if the sentence is longer). */
function pageLines(context: CanvasRenderingContext2D, text: string): string[] {
  const maxLines = Math.floor((HEIGHT - FIRST_LINE) / LINE);
  const lines = wrap(context, text.trim(), WIDTH - 2 * MARGIN);
  return lines.slice(0, maxLines).map((line, i) => (i === maxLines - 1 && lines.length > maxLines ? `${line} …` : line));
}

/** Draws the front of the page and returns where each line of text sits. */
function drawFront(canvas: HTMLCanvasElement, lines: string[], family: string): LineSpot[] {
  const context = setUp(canvas, family);
  if (!context) return [];
  // Faint ruled lines, like a page from an exercise book.
  context.strokeStyle = "rgba(27, 46, 80, 0.12)";
  context.lineWidth = 2;
  for (let y = FIRST_LINE + 14; y < HEIGHT - 30; y += LINE) {
    context.beginPath();
    context.moveTo(MARGIN - 20, y);
    context.lineTo(WIDTH - MARGIN + 20, y);
    context.stroke();
  }
  context.fillStyle = COLORS.navy;
  return lines.map((line, i) => {
    const baseline = FIRST_LINE + i * LINE;
    context.fillText(line, MARGIN, baseline);
    // The middle of the letters sits about a third of the font size above the baseline.
    return { v: toV(baseline - FONT_SIZE * 0.35), uStart: toU(MARGIN), uEnd: toU(MARGIN + context.measureText(line).width) };
  });
}

/** The back of the page: the same words, faint and mirrored, as if seen through the paper. */
function drawBack(canvas: HTMLCanvasElement, lines: string[], family: string) {
  const context = setUp(canvas, family);
  if (!context) return;
  context.setTransform(-1, 0, 0, 1, WIDTH, 0);
  context.globalAlpha = 0.12;
  context.fillStyle = COLORS.navy;
  lines.forEach((line, i) => context.fillText(line, MARGIN, FIRST_LINE + i * LINE));
}

interface Side {
  canvas: HTMLCanvasElement;
  texture: CanvasTexture;
}

function makeSide(material: MeshStandardMaterial | null): Side {
  const canvas = document.createElement("canvas");
  canvas.width = WIDTH;
  canvas.height = HEIGHT;
  // A blank page straight away, so the paper never shows up black while the font loads.
  setUp(canvas, "sans-serif");
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  texture.anisotropy = 8;
  if (material) {
    material.map = texture;
    material.needsUpdate = true;
  }
  return { canvas, texture };
}

interface PaperProps {
  /** The sentence the user typed. */
  text: string;
  /** Called after each redraw with where the lines of text are, so the robot's eyes can follow them. */
  onLayout?: (lines: LineSpot[]) => void;
  /** The paper's group. The robot moves it when it picks the paper up. */
  ref?: Ref<Group>;
}

export function Paper({ text, onLayout, ref }: PaperProps) {
  const frontMaterial = useRef<MeshStandardMaterial>(null);
  const backMaterial = useRef<MeshStandardMaterial>(null);
  const sides = useRef<{ front: Side; back: Side } | null>(null);
  const layoutCallback = useRef(onLayout);

  useEffect(() => {
    layoutCallback.current = onLayout;
  }, [onLayout]);

  // The canvases and textures are made once, in the browser, and freed when the scene goes away.
  useEffect(() => {
    const made = { front: makeSide(frontMaterial.current), back: makeSide(backMaterial.current) };
    sides.current = made;
    return () => {
      made.front.texture.dispose();
      made.back.texture.dispose();
      sides.current = null;
    };
  }, []);

  // Redraw whenever the sentence changes, once Anek Tamil has loaded (otherwise a fallback font is used).
  useEffect(() => {
    let cancelled = false;
    const family = anekTamilFamily();
    void document.fonts
      .load(`500 ${FONT_SIZE}px ${family}`, "தமிழ்")
      .catch(() => [])
      .then(() => {
        const current = sides.current;
        const context = current?.front.canvas.getContext("2d");
        if (cancelled || !current || !context) return;
        context.font = `500 ${FONT_SIZE}px ${family}`;
        const lines = pageLines(context, text);
        const spots = drawFront(current.front.canvas, lines, family);
        drawBack(current.back.canvas, lines, family);
        current.front.texture.needsUpdate = true;
        current.back.texture.needsUpdate = true;
        layoutCallback.current?.(spots);
      });
    return () => {
      cancelled = true;
    };
  }, [text]);

  const [width, height] = ROOM.paper.size;
  return (
    <group ref={ref} name="paper" position={PAPER_ON_DESK.position} rotation={PAPER_ON_DESK.rotation}>
      <mesh receiveShadow castShadow>
        <planeGeometry args={[width, height]} />
        <meshStandardMaterial ref={frontMaterial} color="#ffffff" roughness={0.85} />
      </mesh>
      <mesh rotation={[0, Math.PI, 0]} receiveShadow>
        <planeGeometry args={[width, height]} />
        <meshStandardMaterial ref={backMaterial} color="#ffffff" roughness={0.9} />
      </mesh>
    </group>
  );
}
