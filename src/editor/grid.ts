/**
 * A point in world/grid space.
 *
 * Convention:
 * - Units are "world units" (not pixels).
 * - Grid snapping operates in these same units.
 */
export type Point = {
  x: number;
  y: number;
};

/**
 * Grid abstraction.
 *
 * Responsibilities:
 * - Define grid spacing
 * - Snap arbitrary world-space points to nearest grid intersection
 *
 * This class intentionally does NOT:
 * - Know about rendering
 * - Know about camera
 * - Know about components
 *
 * It is purely mathematical.
 */
export class Grid {
  /** Distance between grid lines in world units. */
  public readonly size: number;

  constructor(size: number) {
    this.size = size;
  }

  /**
   * Snap a world-space point to the nearest grid intersection.
   *
   * Rounding behaviour:
   * - Uses Math.round so snapping is symmetric in all directions.
   * - Assumes coordinates are in same units as grid size.
   */
  snap(p: Point): Point {
    const s = this.size;

    return {
      x: Math.round(p.x / s) * s,
      y: Math.round(p.y / s) * s,
    };
  }
}
