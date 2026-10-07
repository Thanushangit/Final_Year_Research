// Geometry helpers for the android's body: curved armour plates, thick shell pieces and cables.
import { BufferGeometry, CatmullRomCurve3, ExtrudeGeometry, LatheGeometry, Shape, TubeGeometry, Vector2, Vector3 } from "three";
import { TessellateModifier } from "three/examples/jsm/modifiers/TessellateModifier.js";
import { toCreasedNormals } from "three/examples/jsm/utils/BufferGeometryUtils.js";

export type Point2 = readonly [number, number];
export type Point3 = readonly [number, number, number];

/** A closed outline through `points`, with every corner rounded off. */
export function roundedOutline(points: readonly Point2[], radius: number): Shape {
  const shape = new Shape();
  const n = points.length;
  for (let i = 0; i < n; i++) {
    const [px, py] = points[(i - 1 + n) % n];
    const [cx, cy] = points[i];
    const [nx, ny] = points[(i + 1) % n];
    const toPrev = new Vector2(px - cx, py - cy);
    const toNext = new Vector2(nx - cx, ny - cy);
    const r = Math.min(radius, toPrev.length() / 2, toNext.length() / 2);
    const start = new Vector2(cx, cy).addScaledVector(toPrev.normalize(), r);
    const end = new Vector2(cx, cy).addScaledVector(toNext.normalize(), r);
    if (i === 0) shape.moveTo(start.x, start.y);
    else shape.lineTo(start.x, start.y);
    shape.quadraticCurveTo(cx, cy, end.x, end.y);
  }
  shape.closePath();
  return shape;
}

export interface PlateOptions {
  thickness: number;
  /** Rounded corners of the outline. */
  corner?: number;
  /** Rounded (bevelled) front and back edges. */
  bevel?: number;
  /** Curves the plate around an upright axis (radius in metres; omit for flat). */
  bendAcross?: number;
  /** Curves the plate around a sideways axis. */
  bendDown?: number;
}

/**
 * An armour plate: the outline (in x/y, facing +z) is extruded with bevelled edges, split into small
 * triangles, then bent so it wraps the body. Smooth across the face, crisp at the bevels.
 */
export function armorPlate(outline: readonly Point2[], options: PlateOptions): BufferGeometry {
  const bevel = options.bevel ?? 0.003;
  const extruded = new ExtrudeGeometry(roundedOutline(outline, options.corner ?? 0.008), {
    depth: options.thickness,
    bevelEnabled: true,
    bevelThickness: bevel,
    bevelSize: bevel,
    bevelSegments: 2,
    curveSegments: 5,
  });
  const geometry = new TessellateModifier(0.02, 6).modify(extruded);
  extruded.dispose();
  const position = geometry.getAttribute("position");
  for (let i = 0; i < position.count; i++) {
    let x = position.getX(i);
    let y = position.getY(i);
    let z = position.getZ(i);
    if (options.bendAcross) {
      const r = options.bendAcross;
      const a = x / r;
      [x, z] = [Math.sin(a) * (r + z), Math.cos(a) * (r + z) - r];
    }
    if (options.bendDown) {
      const r = options.bendDown;
      const a = y / r;
      [y, z] = [Math.sin(a) * (r + z), Math.cos(a) * (r + z) - r];
    }
    position.setXYZ(i, x, y, z);
  }
  const shaded = toCreasedNormals(geometry, Math.PI / 5);
  shaded.computeBoundingSphere();
  return shaded;
}

/**
 * A thick shell piece: `outer` (radius, height) points from top to bottom are spun around the y axis
 * over part of a turn; the inner surface sits `thickness` inside, and the two meet in rounded rims.
 */
export function shellPiece(outer: readonly Point2[], thickness: number, phiStart: number, phiLength: number, segments = 32): BufferGeometry {
  const inner = (r: number) => Math.max(0.001, r - thickness);
  const top = outer[0];
  const bottom = outer[outer.length - 1];
  // One loop: inner bottom → rounded bottom rim → outer surface upwards → rounded top rim → inner surface down.
  // (Going up the outside makes those faces point outwards.)
  const points: Vector2[] = [new Vector2(inner(bottom[0]), bottom[1]), new Vector2(bottom[0] - thickness / 2, bottom[1] - thickness * 0.3)];
  for (let i = outer.length - 1; i >= 0; i--) points.push(new Vector2(outer[i][0], outer[i][1]));
  points.push(new Vector2(top[0] - thickness / 2, top[1] + thickness * 0.3));
  for (const [r, y] of outer) points.push(new Vector2(inner(r), y));
  return new LatheGeometry(points, segments, phiStart, phiLength);
}

/** A round cable along a smooth curve through `points`. */
export function cable(points: readonly Point3[], radius: number, segments = 32): BufferGeometry {
  const curve = new CatmullRomCurve3(points.map(([x, y, z]) => new Vector3(x, y, z)));
  return new TubeGeometry(curve, segments, radius, 10, false);
}
