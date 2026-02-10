import type { Point } from "./grid";

export type RotationDeg = 0 | 90 | 180 | 270;

export type PortDef = {
  name: string;           // "A", "B", "+", "-"
  offset: Point;          // relative to component centre, in SVG/world units
};

export type BBox = {
  x: number; // top-left (relative to centre)
  y: number;
  w: number;
  h: number;
};

export type ComponentInstance = {
  id: string;
  typeId: string;
  pos: Point;             // snapped world position (centre)
  rotation: RotationDeg;
  params: Record<string, number>;
};

export type WireSegment = {
  id: string;
  a: Point; // grid-aligned world point
  b: Point; // grid-aligned world point (axis-aligned)
};