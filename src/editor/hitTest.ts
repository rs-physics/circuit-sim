import type { Point } from "./grid";
import type { ComponentInstance, BBox, WireSegment } from "./types";
import type { EditorState } from "./state";
import { getComponentType } from "./registry";
import { rotatePoint } from "./geom";

/**
 * Result of hit testing the editor.
 * - component: clicked within a component bbox (in world space)
 * - wire: clicked near a wire segment (with tolerance)
 */
export type Hit =
  | { kind: "component"; id: string }
  | { kind: "wire"; id: string }
  | null;

/**
 * Axis-aligned bounding box in world space.
 * (Even if a component is rotated, we convert its rotated bbox to a world AABB.)
 */
type AABB = { x: number; y: number; w: number; h: number };

// -----------------------------------------------------------------------------
// Helpers: bbox hit testing
// -----------------------------------------------------------------------------

/**
 * Convert a local-space bbox into a world-space axis-aligned bounding box.
 *
 * V1 approach:
 * - take the 4 corners of the local bbox
 * - rotate each corner by component rotation
 * - translate by component position
 * - take min/max extents to form an AABB
 *
 * This is not a "rotated bbox" test; it's an AABB of the rotated shape.
 * It's slightly more generous, but great for selection UX.
 */
function bboxToWorldAabb(inst: ComponentInstance, local: BBox): AABB {
  const corners: Point[] = [
    { x: local.x, y: local.y },
    { x: local.x + local.w, y: local.y },
    { x: local.x + local.w, y: local.y + local.h },
    { x: local.x, y: local.y + local.h },
  ];

  const worldCorners = corners.map((c) => {
    const r = rotatePoint(c, inst.rotation);
    return { x: inst.pos.x + r.x, y: inst.pos.y + r.y };
  });

  let minX = worldCorners[0].x;
  let maxX = worldCorners[0].x;
  let minY = worldCorners[0].y;
  let maxY = worldCorners[0].y;

  for (let i = 1; i < worldCorners.length; i++) {
    minX = Math.min(minX, worldCorners[i].x);
    maxX = Math.max(maxX, worldCorners[i].x);
    minY = Math.min(minY, worldCorners[i].y);
    maxY = Math.max(maxY, worldCorners[i].y);
  }

  return { x: minX, y: minY, w: maxX - minX, h: maxY - minY };
}

/**
 * Point-in-AABB test (inclusive).
 */
function pointInAabb(p: Point, a: AABB): boolean {
  return p.x >= a.x && p.x <= a.x + a.w && p.y >= a.y && p.y <= a.y + a.h;
}

// -----------------------------------------------------------------------------
// Helpers: wire hit testing
// -----------------------------------------------------------------------------

/**
 * Hit test for a single wire segment with tolerance.
 *
 * V1 assumption:
 * - wires are axis-aligned (horizontal/vertical only)
 *
 * tol is in world units.
 */
function pointHitsWire(p: Point, w: WireSegment, tol: number): boolean {
  // Vertical segment
  if (w.a.x === w.b.x) {
    const x = w.a.x;

    // Too far from the wire's x line
    if (Math.abs(p.x - x) > tol) return false;

    // Within y span (with tol padding)
    const minY = Math.min(w.a.y, w.b.y) - tol;
    const maxY = Math.max(w.a.y, w.b.y) + tol;
    return p.y >= minY && p.y <= maxY;
  }

  // Horizontal segment
  if (w.a.y === w.b.y) {
    const y = w.a.y;

    // Too far from the wire's y line
    if (Math.abs(p.y - y) > tol) return false;

    // Within x span (with tol padding)
    const minX = Math.min(w.a.x, w.b.x) - tol;
    const maxX = Math.max(w.a.x, w.b.x) + tol;
    return p.x >= minX && p.x <= maxX;
  }

  // Diagonal segments aren't expected in V1
  return false;
}

// -----------------------------------------------------------------------------
// Public API
// -----------------------------------------------------------------------------

/**
 * Hit test the editor at a world-space point.
 *
 * Selection priority:
 * 1) Components (so clicking a symbol doesn't accidentally select a wire under it)
 * 2) Wires (tolerant test)
 */
export function hitTest(state: EditorState, p: Point): Hit {
  // 1) Components (iterate backwards so "topmost" wins if you later add z-order)
  for (let i = state.components.length - 1; i >= 0; i--) {
    const inst = state.components[i];
    const type = getComponentType(inst.typeId);

    const aabb = bboxToWorldAabb(inst, type.bbox());
    if (pointInAabb(p, aabb)) {
      return { kind: "component", id: inst.id };
    }
  }

  // 2) Wires (tolerant hit test)
  const tol = 6; // tweak to taste (world units)
  for (let i = state.wires.length - 1; i >= 0; i--) {
    const w = state.wires[i];
    if (pointHitsWire(p, w, tol)) {
      return { kind: "wire", id: w.id };
    }
  }

  return null;
}