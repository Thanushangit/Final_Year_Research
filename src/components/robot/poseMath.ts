// Pose arithmetic. Every motion layer is a whole pose or part of one, and the layers are added together.
// GSAP can only tween flat objects of numbers, so a pose is also kept as named "channels" ("head.0", "armR.elbow").
import type { RobotPose, Vec3 } from "./pose";

type DeepPartial<T> = T extends number ? number : T extends Vec3 ? Vec3 : { [K in keyof T]?: DeepPartial<T[K]> };

/** Part of a pose: a target for some joints, or an offset added on top of a pose. Vectors stay whole. */
export type PartialPose = DeepPartial<RobotPose>;

/** A pose flattened to named numbers. GSAP adds a hidden property, so never loop over its keys. */
export type Channels = Record<string, number>;

type Tree = { [key: string]: number | number[] | Tree };
const asTree = (value: object) => value as unknown as Tree;

function addTree(out: Tree, offset: Tree, weight: number) {
  for (const key in offset) {
    const value = offset[key];
    if (typeof value === "number") {
      out[key] = (out[key] as number) + value * weight;
    } else if (Array.isArray(value)) {
      const target = out[key] as number[];
      for (let i = 0; i < value.length; i++) target[i] += value[i] * weight;
    } else {
      addTree(out[key] as Tree, value, weight);
    }
  }
}

/** out += offset × weight, for every number the offset has. */
export function addOffset(out: RobotPose, offset: PartialPose, weight = 1): void {
  if (weight !== 0) addTree(asTree(out), asTree(offset), weight);
}

/** Every number in a pose, as a path such as ["armR", "shoulder", "0"]. */
function pathsOf(node: Tree, prefix: string[] = []): string[][] {
  return Object.keys(node).flatMap((key) => {
    const value = node[key];
    const path = [...prefix, key];
    if (typeof value === "number") return [path];
    if (Array.isArray(value)) return value.map((_, i) => [...path, String(i)]);
    return pathsOf(value, path);
  });
}

interface ChannelPath {
  key: string;
  parents: string[];
  leaf: string;
}

function channelPaths(pose: object): ChannelPath[] {
  return pathsOf(asTree(pose)).map((path) => ({ key: path.join("."), parents: path.slice(0, -1), leaf: path[path.length - 1] }));
}

/** Flattens a whole or partial pose: { head: [0.1, 0, 0] } becomes { "head.0": 0.1, "head.1": 0, "head.2": 0 }. */
export function toChannels(pose: object): Channels {
  const channels: Channels = {};
  for (const { key, parents, leaf } of channelPaths(pose)) {
    let node: Tree = asTree(pose);
    for (const part of parents) node = node[part] as Tree;
    channels[key] = node[leaf] as number;
  }
  return channels;
}

/** Writes channels back into a pose. Built once for the pose's shape; cheap enough to run every frame. */
export function channelWriter(shape: RobotPose): (channels: Channels, out: RobotPose) => void {
  const paths = channelPaths(shape);
  return (channels, out) => {
    for (const { key, parents, leaf } of paths) {
      const value = channels[key];
      if (value === undefined) continue;
      let node: Tree = asTree(out);
      for (const part of parents) node = node[part] as Tree;
      node[leaf] = value;
    }
  };
}

/** Which body part a channel belongs to ("armR.elbow.0" → "elbow"), so parts can start one after another. */
export function partOf(key: string): string {
  const [top, second] = key.split(".");
  if (top !== "armL" && top !== "armR") return top;
  return second === "curl" || second === "thumb" ? "hand" : second;
}

/** Splits a channel set by body part. */
export function groupByPart(channels: Channels): Map<string, Channels> {
  const groups = new Map<string, Channels>();
  for (const [key, value] of Object.entries(channels)) {
    const part = partOf(key);
    const group = groups.get(part) ?? {};
    group[key] = value;
    groups.set(part, group);
  }
  return groups;
}

export const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
