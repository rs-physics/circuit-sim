import type { Point } from "./grid";
import type { RotationDeg } from "./types";

/**
 * Rotate a local-space point around the origin.
 *
 * Rotation is limited to 0/90/180/270 degrees (RotationDeg).
 * This keeps everything grid-aligned and avoids floating point errors.
 *
 * NOTE:
 * This assumes a standard mathematical coordinate system where:
 *   +x is right
 *   +y is down (SVG-style)
 */
export function rotatePoint(p: Point, rot: RotationDeg): Point {
  switch (rot) {
    case 0:
      return { x: p.x, y: p.y };

    case 90:
      return { x: -p.y, y: p.x };

    case 180:
      return { x: -p.x, y: -p.y };

    case 270:
      return { x: p.y, y: -p.x };
  }
}

/**
 * Produce orthogonal (Manhattan) segments between two points.
 *
 * Behaviour:
 * - If already aligned horizontally or vertically → single segment.
 * - Otherwise → deterministic "elbow":
 *     horizontal first, then vertical.
 *
 * This is used for:
 * - live wire preview
 * - basic wire placement
 */
export function manhattanSegments(
  a: Point,
  b: Point
): { a: Point; b: Point }[] {
  // Already axis-aligned
  if (a.x === b.x || a.y === b.y) {
    return [{ a, b }];
  }

  // Horizontal first, then vertical
  const mid: Point = { x: b.x, y: a.y };

  return [
    { a, b: mid },
    { a: mid, b },
  ];
}

/**
 * Manhattan routing from a fixed endpoint to a moving target,
 * preserving the orientation of the original incoming segment.
 *
 * This is used during component dragging (reroute preview).
 *
 * Behaviour:
 * - If aligned → single segment.
 * - Otherwise:
 *     If original segment was horizontal ("h"):
 *         go vertical first.
 *     If original segment was vertical ("v"):
 *         go horizontal first.
 *
 * This preserves the visual continuity of wires while dragging.
 */
export function manhattanFromFixed(
  fixed: Point,
  target: Point,
  incomingAxis: "h" | "v"
): { a: Point; b: Point }[] {
  // Already axis-aligned
  if (fixed.x === target.x || fixed.y === target.y) {
    return [{ a: fixed, b: target }];
  }

  const mid: Point =
    incomingAxis === "h"
      ? { x: fixed.x, y: target.y }   // original was horizontal → bend vertically first
      : { x: target.x, y: fixed.y };  // original was vertical → bend horizontally first

  return [
    { a: fixed, b: mid },
    { a: mid, b: target },
  ];
}
