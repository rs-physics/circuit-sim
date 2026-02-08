export type Point = { x: number; y: number };

export class Grid {
  public readonly size: number;

  constructor(size: number) {
    this.size = size;
  }

  snap(p: Point): Point {
    const s = this.size;
    return {
      x: Math.round(p.x / s) * s,
      y: Math.round(p.y / s) * s,
    };
  }
}