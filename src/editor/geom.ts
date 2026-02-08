import type { Point } from "./grid";
import type { RotationDeg } from "./types";

export function rotatePoint(p: Point, rot: RotationDeg): Point {
  switch (rot) {
    case 0: return { x: p.x, y: p.y };
    case 90: return { x: -p.y, y: p.x };
    case 180: return { x: -p.x, y: -p.y };
    case 270: return { x: p.y, y: -p.x };
  }
}
