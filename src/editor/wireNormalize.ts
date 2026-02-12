// src/editor/wireNormalize.ts
import type { Point } from "./grid";
import type { WireSegment } from "./types";
import type { ComponentInstance } from "./types";
import type { ComponentType } from "./componentType";


/**
 * V1 wire model:
 * - Wires are stored as axis-aligned segments (horizontal or vertical).
 * - But user actions can create overlaps, duplicates, or long runs.
 *
 * This module canonicalizes wires into a stable form:
 *  1) Merge collinear overlaps/adjacency into maximal "runs"
 *  2) Find junction points (endpoints, crossings, T-junctions)
 *  3) Split runs into minimal segments between junctions
 *  4) Dedupe the resulting segments
 */

type Axis = "h" | "v";

/** Stable key for a point (used for maps/sets). */
const pointKey = (p: Point) => `${p.x},${p.y}`;

/**
 * Stable key for a segment geometry (used for deduping).
 * Encodes:
 * - axis (H/V)
 * - constant coordinate (y for H, x for V)
 * - min/max of varying coordinate
 */
const segmentKey = (a: Point, b: Point) => {
  if (a.x === b.x) {
    // vertical
    const y1 = Math.min(a.y, b.y);
    const y2 = Math.max(a.y, b.y);
    return `V:${a.x}:${y1}:${y2}`;
  } else {
    // horizontal
    const x1 = Math.min(a.x, b.x);
    const x2 = Math.max(a.x, b.x);
    return `H:${a.y}:${x1}:${x2}`;
  }
};

/**
 * Normalize a Manhattan segment:
 * - validate axis aligned
 * - ensure ordering is consistent:
 *    - vertical: a.y <= b.y
 *    - horizontal: a.x <= b.x
 * - attach computed axis
 */
const normalizeSegment = (a: Point, b: Point): { a: Point; b: Point; axis: Axis } => {
  if (a.x !== b.x && a.y !== b.y) {
    throw new Error(`Non-Manhattan segment: (${a.x},${a.y}) -> (${b.x},${b.y})`);
  }

  // Vertical
  if (a.x === b.x) {
    return a.y <= b.y ? { a, b, axis: "v" } : { a: b, b: a, axis: "v" };
  }

  // Horizontal
  return a.x <= b.x ? { a, b, axis: "h" } : { a: b, b: a, axis: "h" };
};

/** True if point p lies on the (inclusive) span of normalized segment s. */
const pointOnSegment = (p: Point, s: { a: Point; b: Point; axis: Axis }) => {
  if (s.axis === "v") {
    if (p.x !== s.a.x) return false;
    return p.y >= s.a.y && p.y <= s.b.y;
  } else {
    if (p.y !== s.a.y) return false;
    return p.x >= s.a.x && p.x <= s.b.x;
  }
};

/** Deduplicate a list of points by coordinate. */
const uniquePoints = (pts: Point[]): Point[] => {
  const m = new Map<string, Point>();
  for (const p of pts) m.set(pointKey(p), p);
  return Array.from(m.values());
};

/** Sort points along a segment axis (vertical by y, horizontal by x). */
const sortAlongAxis = (pts: Point[], axis: Axis) => {
  return pts
    .slice()
    .sort((p1, p2) => (axis === "v" ? p1.y - p2.y : p1.x - p2.x));
};

// -----------------------------------------------------------------------------
// PASS 1: Merge collinear overlaps / adjacency into maximal runs
// -----------------------------------------------------------------------------

/**
 * Merge collinear overlaps + end-to-end adjacency into maximal runs.
 *
 * Example (horizontal):
 *   [0..50] + [25..80] + [80..100]  =>  [0..100]
 *
 * We group:
 * - horizontals by constant y
 * - verticals by constant x
 */
function mergeCollinearRuns(
  segs: { a: Point; b: Point; axis: Axis }[]
): { a: Point; b: Point; axis: Axis }[] {
  const out: { a: Point; b: Point; axis: Axis }[] = [];

  const hGroups = new Map<number, { a: Point; b: Point }[]>(); // key: y
  const vGroups = new Map<number, { a: Point; b: Point }[]>(); // key: x

  // Partition segments by axis + constant coordinate
  for (const s of segs) {
    if (s.axis === "h") {
      const y = s.a.y;
      const arr = hGroups.get(y) ?? [];
      arr.push({ a: s.a, b: s.b });
      hGroups.set(y, arr);
    } else {
      const x = s.a.x;
      const arr = vGroups.get(x) ?? [];
      arr.push({ a: s.a, b: s.b });
      vGroups.set(x, arr);
    }
  }

  // Merge horizontals within each y group
  for (const [, group] of hGroups.entries()) {
    const sorted = group
      .map((g) => normalizeSegment(g.a, g.b))
      .sort((s1, s2) => s1.a.x - s2.a.x);

    let curA = sorted[0].a;
    let curB = sorted[0].b;

    for (let i = 1; i < sorted.length; i++) {
      const s = sorted[i];

      // overlap (including inside current span)
      if (s.a.x <= curB.x) {
        if (s.b.x > curB.x) curB = s.b;
        continue;
      }

      // touch (adjacent)
      if (s.a.x === curB.x) {
        curB = s.b;
        continue;
      }

      // gap => commit current run and start new
      if (!(curA.x === curB.x && curA.y === curB.y)) {
        out.push({ a: curA, b: curB, axis: "h" });
      }
      curA = s.a;
      curB = s.b;
    }

    // commit last
    if (!(curA.x === curB.x && curA.y === curB.y)) {
      out.push({ a: curA, b: curB, axis: "h" });
    }
  }

  // Merge verticals within each x group
  for (const [, group] of vGroups.entries()) {
    const sorted = group
      .map((g) => normalizeSegment(g.a, g.b))
      .sort((s1, s2) => s1.a.y - s2.a.y);

    let curA = sorted[0].a;
    let curB = sorted[0].b;

    for (let i = 1; i < sorted.length; i++) {
      const s = sorted[i];

      if (s.a.y <= curB.y) {
        if (s.b.y > curB.y) curB = s.b;
        continue;
      }

      if (s.a.y === curB.y) {
        curB = s.b;
        continue;
      }

      if (!(curA.x === curB.x && curA.y === curB.y)) {
        out.push({ a: curA, b: curB, axis: "v" });
      }
      curA = s.a;
      curB = s.b;
    }

    if (!(curA.x === curB.x && curA.y === curB.y)) {
      out.push({ a: curA, b: curB, axis: "v" });
    }
  }

  return out;
}

// -----------------------------------------------------------------------------
// Public API: Normalize + segment wires
// -----------------------------------------------------------------------------

/**
 * Two-pass canonicalization:
 *
 * PASS 1) Merge collinear runs (history independent)
 * PASS 2) Compute junction points, then split runs into minimal pieces between junctions
 *
 * extraJunctionPoints can be provided if you want to force splits at ports, etc.
 *
 * NOTE:
 * IDs are regenerated in output (because geometry may change).
 */
export function normalizeAndSegmentWires(
  wires: WireSegment[],
  extraJunctionPoints: Point[] = [],
  makeId: () => string = () => crypto.randomUUID()
): WireSegment[] {
  if (wires.length === 0) return [];

  // Normalize + drop zero-length segments early
  const base = wires
    .map((w) => normalizeSegment(w.a, w.b))
    .filter((s) => !(s.a.x === s.b.x && s.a.y === s.b.y));

  // PASS 1: merge into maximal runs
  const runs = mergeCollinearRuns(base);

  // PASS 2: build junction set
  // A junction is any point where a run should be split.
  const junctionSet = new Map<string, Point>();

  // (a) run endpoints + extra junction points
  for (const r of runs) {
    junctionSet.set(pointKey(r.a), r.a);
    junctionSet.set(pointKey(r.b), r.b);
  }
  for (const p of extraJunctionPoints) {
    junctionSet.set(pointKey(p), p);
  }

  // (b) perpendicular intersections (crossings + some T cases)
  const verticals = runs.filter((r) => r.axis === "v");
  const horizontals = runs.filter((r) => r.axis === "h");

  for (const v of verticals) {
    for (const h of horizontals) {
      const ix = v.a.x;
      const iy = h.a.y;

      // Intersection point lies within both spans
      if (ix >= h.a.x && ix <= h.b.x && iy >= v.a.y && iy <= v.b.y) {
        const p = { x: ix, y: iy };
        junctionSet.set(pointKey(p), p);
      }
    }
  }

  // (c) endpoint-on-run (T-junctions where an endpoint lands on another run interior)
  // Collect current endpoints (including extras and intersections) and add any that sit on any run.
  const endpoints = Array.from(junctionSet.values());
  for (const r of runs) {
    for (const p of endpoints) {
      if (pointOnSegment(p, r)) {
        junctionSet.set(pointKey(p), p);
      }
    }
  }

  const junctions = Array.from(junctionSet.values());

  // Split each run at junction points that lie on it
  const pieces: { a: Point; b: Point; axis: Axis }[] = [];

  for (const r of runs) {
    const cuts = junctions.filter((p) => pointOnSegment(p, r));
    const sorted = sortAlongAxis(uniquePoints(cuts), r.axis);

    for (let i = 0; i < sorted.length - 1; i++) {
      const a = sorted[i];
      const b = sorted[i + 1];
      if (a.x === b.x && a.y === b.y) continue;
      pieces.push(normalizeSegment(a, b));
    }
  }

  // Dedupe final pieces by geometry
  const byKey = new Map<string, { a: Point; b: Point; axis: Axis }>();
  for (const s of pieces) {
    byKey.set(segmentKey(s.a, s.b), s);
  }

  // Convert to WireSegment list with fresh ids
  return Array.from(byKey.values())
    .filter((s) => !(s.a.x === s.b.x && s.a.y === s.b.y))
    .map((s) => ({ id: makeId(), a: s.a, b: s.b }));
}

type PortPair = { a: Point; b: Point };

/** Point equality by coordinate. */
const samePoint = (p: Point, q: Point) => p.x === q.x && p.y === q.y;

/** True if p lies strictly between endpoints along the component axis line. */
const pointStrictlyBetweenPorts = (p: Point, a: Point, b: Point): boolean => {
  // vertical
  if (a.x === b.x) {
    if (p.x !== a.x) return false;
    const y1 = Math.min(a.y, b.y);
    const y2 = Math.max(a.y, b.y);
    return p.y > y1 && p.y < y2;
  }

  // horizontal
  if (a.y === b.y) {
    if (p.y !== a.y) return false;
    const x1 = Math.min(a.x, b.x);
    const x2 = Math.max(a.x, b.x);
    return p.x > x1 && p.x < x2;
  }

  // non-manhattan ports shouldn't happen in V1
  return false;
};

/**
 * Remove any wire segments that lie entirely between ports, BUT ONLY if the span
 * is a "clean run" (no junction endpoints strictly between the ports).
 *
 * This avoids accidentally chopping through a T-junction or crossing.
 */
function spliceOutBetweenPorts(wires: WireSegment[], pair: PortPair): WireSegment[] {
  const p1 = pair.a;
  const p2 = pair.b;

  // Only splice if ports are colinear (axis-aligned)
  const isVertical = p1.x === p2.x;
  const isHorizontal = p1.y === p2.y;
  if (!isVertical && !isHorizontal) return wires;

  // If there are any junction endpoints strictly between ports on that line, abort splice.
  // (After normalization, endpoints are only junctions / intersections / ends, not every grid point.)
  for (const s of wires) {
    const a = s.a;
    const b = s.b;

    // endpoints, excluding the ports themselves
    for (const ep of [a, b]) {
      if (samePoint(ep, p1) || samePoint(ep, p2)) continue;
      if (pointStrictlyBetweenPorts(ep, p1, p2)) {
        return wires; // abort: we'd disconnect a junction
      }
    }
  }

  // Otherwise, delete segments entirely inside the [p1,p2] span on the same line.
  if (isVertical) {
    const x = p1.x;
    const y1 = Math.min(p1.y, p2.y);
    const y2 = Math.max(p1.y, p2.y);

    return wires.filter((s) => {
      // keep non-verticals
      if (s.a.x !== s.b.x) return true;
      // keep verticals not on this x
      if (s.a.x !== x) return true;

      const segMin = Math.min(s.a.y, s.b.y);
      const segMax = Math.max(s.a.y, s.b.y);

      // remove if fully within span (including touching the port endpoints)
      const inside = segMin >= y1 && segMax <= y2;
      return !inside;
    });
  }

  // horizontal
  const y = p1.y;
  const x1 = Math.min(p1.x, p2.x);
  const x2 = Math.max(p1.x, p2.x);

  return wires.filter((s) => {
    // keep non-horizontals
    if (s.a.y !== s.b.y) return true;
    // keep horizontals not on this y
    if (s.a.y !== y) return true;

    const segMin = Math.min(s.a.x, s.b.x);
    const segMax = Math.max(s.a.x, s.b.x);

    const inside = segMin >= x1 && segMax <= x2;
    return !inside;
  });
}

/**
 * Build 2-port pairs for components.
 * Assumes the component type exposes exactly two ports for V1 components.
 * If a component has 0/1/3+ ports later, it's ignored by splicing.
 */
function getTwoPortPairs(
  components: ComponentInstance[],
  getType: (typeId: string) => ComponentType
): PortPair[] {
  const out: PortPair[] = [];

  for (const inst of components) {
    const t = getType(inst.typeId);
    const ports = t.portWorldPositions(inst);

    if (ports.length !== 2) continue;

    out.push({ a: ports[0].pos, b: ports[1].pos });
  }

  return out;
}

/**
 * Normalize wires AND auto-splice components into straight runs:
 * - splits at component ports (via extraJunctionPoints)
 * - removes the wire span between the two ports if it's a clean run
 */
export function normalizeAndSpliceWires(
  wires: WireSegment[],
  components: ComponentInstance[],
  getType: (typeId: string) => ComponentType,
  makeId: () => string = () => crypto.randomUUID()
): WireSegment[] {
  if (wires.length === 0) return [];

  const pairs = getTwoPortPairs(components, getType);
  const portPoints = pairs.flatMap((p) => [p.a, p.b]);

  // 1) split at ports + normal junctions
  let out = normalizeAndSegmentWires(wires, portPoints, makeId);

  // 2) splice delete between ports (conservative: only if no junctions inside span)
  for (const pair of pairs) {
    out = spliceOutBetweenPorts(out, pair);
  }

  return out;
}
