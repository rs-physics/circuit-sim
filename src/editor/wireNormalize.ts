// src/editor/wireNormalize.ts
import type { Point } from "./grid";
import type { WireSegment } from "./types";

type Axis = "h" | "v";

const pkey = (p: Point) => `${p.x},${p.y}`;

const segKey = (a: Point, b: Point) => {
  if (a.x === b.x) {
    const y1 = Math.min(a.y, b.y);
    const y2 = Math.max(a.y, b.y);
    return `V:${a.x}:${y1}:${y2}`;
  } else {
    const x1 = Math.min(a.x, b.x);
    const x2 = Math.max(a.x, b.x);
    return `H:${a.y}:${x1}:${x2}`;
  }
};

const normSeg = (a: Point, b: Point): { a: Point; b: Point; axis: Axis } => {
  if (a.x !== b.x && a.y !== b.y) {
    throw new Error(`Non-Manhattan segment: (${a.x},${a.y}) -> (${b.x},${b.y})`);
  }
  if (a.x === b.x) {
    return a.y <= b.y ? { a, b, axis: "v" } : { a: b, b: a, axis: "v" };
  }
  return a.x <= b.x ? { a, b, axis: "h" } : { a: b, b: a, axis: "h" };
};

const pointOnSeg = (p: Point, s: { a: Point; b: Point; axis: Axis }) => {
  if (s.axis === "v") {
    if (p.x !== s.a.x) return false;
    return p.y >= s.a.y && p.y <= s.b.y;
  } else {
    if (p.y !== s.a.y) return false;
    return p.x >= s.a.x && p.x <= s.b.x;
  }
};

const uniquePoints = (pts: Point[]): Point[] => {
  const m = new Map<string, Point>();
  for (const p of pts) m.set(pkey(p), p);
  return Array.from(m.values());
};

const sortAlong = (pts: Point[], axis: Axis) => {
  return pts
    .slice()
    .sort((p1, p2) => (axis === "v" ? p1.y - p2.y : p1.x - p2.x));
};

/** PASS 1: merge collinear overlaps + end-to-end adjacency into maximal runs */
function mergeCollinearRuns(
  segs: { a: Point; b: Point; axis: Axis }[]
): { a: Point; b: Point; axis: Axis }[] {
  const out: { a: Point; b: Point; axis: Axis }[] = [];

  // horizontals grouped by y
  const hGroups = new Map<number, { a: Point; b: Point }[]>();
  // verticals grouped by x
  const vGroups = new Map<number, { a: Point; b: Point }[]>();

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

  // merge horizontals
  for (const [, group] of hGroups.entries()) {
    const sorted = group
      .map((g) => normSeg(g.a, g.b))
      .sort((s1, s2) => s1.a.x - s2.a.x);

    let curA = sorted[0].a;
    let curB = sorted[0].b;

    for (let i = 1; i < sorted.length; i++) {
      const s = sorted[i];
      // overlap or touch (adjacent)
      if (s.a.x <= curB.x) {
        if (s.b.x > curB.x) curB = s.b;
      } else if (s.a.x === curB.x) {
        curB = s.b;
      } else {
        if (!(curA.x === curB.x && curA.y === curB.y)) out.push({ a: curA, b: curB, axis: "h" });
        curA = s.a;
        curB = s.b;
      }
    }
    if (!(curA.x === curB.x && curA.y === curB.y)) out.push({ a: curA, b: curB, axis: "h" });
  }

  // merge verticals
  for (const [, group] of vGroups.entries()) {
    const sorted = group
      .map((g) => normSeg(g.a, g.b))
      .sort((s1, s2) => s1.a.y - s2.a.y);

    let curA = sorted[0].a;
    let curB = sorted[0].b;

    for (let i = 1; i < sorted.length; i++) {
      const s = sorted[i];
      if (s.a.y <= curB.y) {
        if (s.b.y > curB.y) curB = s.b;
      } else if (s.a.y === curB.y) {
        curB = s.b;
      } else {
        if (!(curA.x === curB.x && curA.y === curB.y)) out.push({ a: curA, b: curB, axis: "v" });
        curA = s.a;
        curB = s.b;
      }
    }
    if (!(curA.x === curB.x && curA.y === curB.y)) out.push({ a: curA, b: curB, axis: "v" });
  }

  return out;
}

/**
 * Two-pass canonicalization:
 * PASS 1) merge collinear runs (history-independent)
 * PASS 2) find junctions then split runs into minimal segments between junctions
 */
export function normalizeAndSegmentWires(
  wires: WireSegment[],
  extraJunctionPoints: Point[] = [],
  makeId: () => string = () => crypto.randomUUID()
): WireSegment[] {
  if (wires.length === 0) return [];

  // Normalize + drop zero-length early
  const base = wires
    .map((w) => normSeg(w.a, w.b))
    .filter((s) => !(s.a.x === s.b.x && s.a.y === s.b.y));

  // PASS 1: merge into maximal runs
  const runs = mergeCollinearRuns(base);

  // PASS 2: build junction set
  const junctionSet = new Map<string, Point>();

  // (a) run endpoints + extra
  for (const r of runs) {
    junctionSet.set(pkey(r.a), r.a);
    junctionSet.set(pkey(r.b), r.b);
  }
  for (const p of extraJunctionPoints) junctionSet.set(pkey(p), p);

  // (b) perpendicular intersections (cross and T-without-endpoint-on-one-side)
  const verticals = runs.filter((r) => r.axis === "v");
  const horizontals = runs.filter((r) => r.axis === "h");

  for (const v of verticals) {
    for (const h of horizontals) {
      const ix = v.a.x;
      const iy = h.a.y;
      if (ix >= h.a.x && ix <= h.b.x && iy >= v.a.y && iy <= v.b.y) {
        const p = { x: ix, y: iy };
        junctionSet.set(pkey(p), p);
      }
    }
  }

  // (c) endpoint-on-run (T junctions where one run endpoint lands on another run interior)
  // collect current endpoints (including extra points)
  const endpoints = Array.from(junctionSet.values());
  for (const r of runs) {
    for (const p of endpoints) {
      if (pointOnSeg(p, r)) junctionSet.set(pkey(p), p);
    }
  }

  const junctions = Array.from(junctionSet.values());

  // Split each run at junctions that lie on it
  const pieces: { a: Point; b: Point; axis: Axis }[] = [];
  for (const r of runs) {
    const cuts = junctions.filter((p) => pointOnSeg(p, r));
    const sorted = sortAlong(uniquePoints(cuts), r.axis);

    for (let i = 0; i < sorted.length - 1; i++) {
      const a = sorted[i];
      const b = sorted[i + 1];
      if (a.x === b.x && a.y === b.y) continue;
      pieces.push(normSeg(a, b));
    }
  }

  // Dedupe final pieces by geometry
  const byKey = new Map<string, { a: Point; b: Point; axis: Axis }>();
  for (const s of pieces) byKey.set(segKey(s.a, s.b), s);

  const finalSegs = Array.from(byKey.values())
    .filter((s) => !(s.a.x === s.b.x && s.a.y === s.b.y))
    .map((s) => ({ id: makeId(), a: s.a, b: s.b }));

  return finalSegs;
}
