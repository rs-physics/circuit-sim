import type { Point } from "./grid";
import type { ComponentInstance, BBox, WireSegment } from "./types";
import type { EditorState } from "./state";
import { getComponentType } from "./registry";
import { rotatePoint } from "./geom";

export type Hit =
  | { kind: "component"; id: string }
  | { kind: "wire"; id: string }
  | null;

type AABB = { x: number; y: number; w: number; h: number };

function bboxToWorldAabb(inst: ComponentInstance, local: BBox): AABB {
  const corners: Point[] = [
    { x: local.x,             y: local.y },
    { x: local.x + local.w,   y: local.y },
    { x: local.x + local.w,   y: local.y + local.h },
    { x: local.x,             y: local.y + local.h },
  ];

  const world = corners.map((c) => {
    const r = rotatePoint(c, inst.rotation);
    return { x: inst.pos.x + r.x, y: inst.pos.y + r.y };
  });

  let minX = world[0].x, maxX = world[0].x;
  let minY = world[0].y, maxY = world[0].y;

  for (let i = 1; i < world.length; i++) {
    minX = Math.min(minX, world[i].x);
    maxX = Math.max(maxX, world[i].x);
    minY = Math.min(minY, world[i].y);
    maxY = Math.max(maxY, world[i].y);
  }

  return { x: minX, y: minY, w: maxX - minX, h: maxY - minY };
}

function pointInAabb(p: Point, a: AABB): boolean {
  return p.x >= a.x && p.x <= a.x + a.w && p.y >= a.y && p.y <= a.y + a.h;
}

function pointHitsWire(p: Point, w: WireSegment, tol: number): boolean {
  // axis-aligned only (V1)
  if (w.a.x === w.b.x) {
    // vertical
    const x = w.a.x;
    if (Math.abs(p.x - x) > tol) return false;
    const minY = Math.min(w.a.y, w.b.y) - tol;
    const maxY = Math.max(w.a.y, w.b.y) + tol;
    return p.y >= minY && p.y <= maxY;
  }

  if (w.a.y === w.b.y) {
    // horizontal
    const y = w.a.y;
    if (Math.abs(p.y - y) > tol) return false;
    const minX = Math.min(w.a.x, w.b.x) - tol;
    const maxX = Math.max(w.a.x, w.b.x) + tol;
    return p.x >= minX && p.x <= maxX;
  }

  return false;
}

export function hitTest(state: EditorState, pWorld: Point): Hit {
  // 1) Components first (so clicks on symbols don’t accidentally pick wires underneath)
  for (let i = state.components.length - 1; i >= 0; i--) {
    const inst = state.components[i];
    const type = getComponentType(inst.typeId);
    const aabb = bboxToWorldAabb(inst, type.bbox());
    if (pointInAabb(pWorld, aabb)) return { kind: "component", id: inst.id };
  }

  // 2) Wires (tolerant hit test)
  const tol = 6; // tweak to taste
  for (let i = state.wires.length - 1; i >= 0; i--) {
    const w = state.wires[i];
    if (pointHitsWire(pWorld, w, tol)) return { kind: "wire", id: w.id };
  }

  return null;
}