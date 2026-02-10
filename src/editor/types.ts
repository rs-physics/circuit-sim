import type { Point } from "./grid";

/**
 * Allowed component rotations in degrees.
 *
 * V1 is restricted to orthogonal rotations only.
 * This simplifies:
 * - bbox calculation
 * - port rotation
 * - wire routing
 */
export type RotationDeg = 0 | 90 | 180 | 270;

/**
 * Definition of a component port in local (component) space.
 *
 * offset is relative to the component centre.
 * These get rotated + translated into world space.
 */
export type PortDef = {
  name: string;      // e.g. "A", "B", "+", "-"
  offset: Point;     // local offset from component centre
};

/**
 * Axis-aligned bounding box in local component space.
 *
 * Coordinates are relative to the component centre.
 */
export type BBox = {
  x: number; // top-left (relative to centre)
  y: number;
  w: number;
  h: number;
};

/**
 * A placed component in the editor.
 *
 * typeId links to a ComponentType via the registry.
 * pos is the snapped world-space centre.
 * params are type-specific numeric parameters (e.g. resistance value).
 */
export type ComponentInstance = {
  id: string;
  typeId: string;
  pos: Point;                 // snapped world position (centre)
  rotation: RotationDeg;
  params: Record<string, number>;
};

/**
 * A single wire segment in world space.
 *
 * V1 constraints:
 * - Axis-aligned only (horizontal or vertical)
 * - Endpoints are grid-aligned
 */
export type WireSegment = {
  id: string;
  a: Point; // world coordinate
  b: Point; // world coordinate (axis-aligned with a)
};
