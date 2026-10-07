// Small textures for the study room, painted on 2D canvases (no image downloads).
import { CanvasTexture, SRGBColorSpace } from "three";
import { createRng } from "@/lib/mock/seeded";
import { COLORS, STUDY } from "../robotConstants";

function paint(width: number, height: number, draw: (ctx: CanvasRenderingContext2D) => void): CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (ctx) draw(ctx);
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

/** A book's spine: the title in a serif face between two thin gold rules. */
export function spineTexture(title: string, background: string, ink: string): CanvasTexture {
  return paint(1024, 160, (ctx) => {
    ctx.fillStyle = background;
    ctx.fillRect(0, 0, 1024, 160);
    ctx.fillStyle = COLORS.gold;
    for (const x of [46, 966]) ctx.fillRect(x, 18, 10, 124);
    ctx.fillStyle = ink;
    ctx.textBaseline = "middle";
    let size = 76;
    do ctx.font = `${size--}px Georgia, "Times New Roman", serif`;
    while (ctx.measureText(title).width > 820);
    ctx.fillText(title, 96, 84);
  });
}

/**
 * The back of the bookshelf: dark walnut, with the warm light of the LED strip under each board
 * fading down the back panel (cheaper than a real light per shelf).
 */
export function shelfBackTexture(): CanvasTexture {
  const boards = STUDY.shelf.boards;
  const bottom = boards[0];
  const top = boards[boards.length - 1];
  const height = 1024;
  const toPx = (y: number) => ((top - y) / (top - bottom)) * height;
  return paint(256, height, (ctx) => {
    ctx.fillStyle = "#2c1c13";
    ctx.fillRect(0, 0, 256, height);
    for (let i = 1; i < boards.length; i++) {
      const lit = toPx(boards[i]);
      const floor = toPx(boards[i - 1]);
      const glow = ctx.createLinearGradient(0, lit, 0, floor);
      glow.addColorStop(0, "rgba(255, 196, 120, 0.95)");
      glow.addColorStop(0.18, "rgba(214, 140, 72, 0.6)");
      glow.addColorStop(0.65, "rgba(110, 66, 36, 0.2)");
      glow.addColorStop(1, "rgba(44, 28, 19, 0)");
      ctx.fillStyle = glow;
      ctx.fillRect(0, lit, 256, floor - lit);
    }
  });
}

/** The view through the window: bright sky and soft, out-of-focus garden greens. */
export function windowTexture(): CanvasTexture {
  return paint(256, 384, (ctx) => {
    const sky = ctx.createLinearGradient(0, 0, 0, 384);
    sky.addColorStop(0, "#fbfaf4");
    sky.addColorStop(0.55, "#eef0e2");
    sky.addColorStop(1, "#c8d2b4");
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, 256, 384);
    const rng = createRng(7);
    ctx.filter = "blur(14px)";
    for (let i = 0; i < 26; i++) {
      const g = 110 + rng.range(0, 60);
      ctx.fillStyle = `rgba(${g - 50}, ${g}, ${g - 70}, ${rng.range(0.35, 0.7)})`;
      ctx.beginPath();
      ctx.arc(rng.range(-20, 276), rng.range(180, 400), rng.range(18, 52), 0, Math.PI * 2);
      ctx.fill();
    }
  });
}

/** A dark antique globe: navy seas and gold-brown land masses. */
export function globeTexture(): CanvasTexture {
  return paint(512, 256, (ctx) => {
    ctx.fillStyle = "#14223a";
    ctx.fillRect(0, 0, 512, 256);
    // Rough continents, placed by longitude/latitude in the equirectangular map.
    const land: [number, number, number, number, number][] = [
      [120, 80, 46, 40, 0.3], [140, 150, 28, 52, -0.2], [270, 70, 70, 34, 0], [285, 140, 34, 48, 0.1],
      [350, 80, 80, 40, 0.1], [420, 175, 30, 18, 0.3], [180, 230, 140, 14, 0], [330, 115, 20, 14, 0],
    ];
    ctx.fillStyle = "#b08a4a";
    for (const [x, y, rx, ry, turn] of land) {
      ctx.beginPath();
      ctx.ellipse(x, y, rx, ry, turn, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.strokeStyle = "rgba(201, 162, 39, 0.35)";
    ctx.lineWidth = 1;
    for (let y = 32; y < 256; y += 32) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(512, y);
      ctx.stroke();
    }
  });
}

/** The laptop screen: a dark editor with a gold voice waveform, a nod to the speaking model. */
export function laptopScreenTexture(): CanvasTexture {
  return paint(512, 320, (ctx) => {
    ctx.fillStyle = COLORS.navy;
    ctx.fillRect(0, 0, 512, 320);
    ctx.fillStyle = "rgba(231, 234, 240, 0.35)";
    const rng = createRng(11);
    for (let row = 0; row < 7; row++) ctx.fillRect(28 + (row % 3) * 18, 26 + row * 16, rng.range(90, 260), 6);
    ctx.strokeStyle = COLORS.gold;
    ctx.lineWidth = 3;
    ctx.beginPath();
    for (let x = 28; x <= 484; x += 4) {
      const envelope = Math.sin(((x - 28) / 456) * Math.PI);
      const y = 236 + Math.sin(x * 0.21) * Math.sin(x * 0.047) * 46 * envelope;
      if (x === 28) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
  });
}
