import type { ComponentInstance, PortDef, BBox } from "./types";
import type { Point } from "./grid";
import type { SchematicSvg } from "../render/schematicSvg";

/**
 * Rendering options passed down to a ComponentType renderer.
 * These are UI/editor concerns, not electrical concerns.
 */
export type RenderOpts = {
  /** Draw as a "ghost" (used during placement preview). */
  preview?: boolean;

  /** Draw as selected (used by editor selection tool). */
  selected?: boolean;
};

/**
 * Symbol geometry specs are the "single source of truth" for how a component looks.
 * Each component type exposes a SymbolSpec; the renderer uses it to draw.
 *
 * As you add more components, you'll extend SymbolSpec with more kinds, e.g.
 * - rectCapacitor
 * - voltageSource
 * - ground
 * etc.
 */
export type RectResistorSpec = {
  kind: "rectResistor";
  bodyW: number;
  bodyH: number;
  lead: number;
};

/**
 * Union of all supported symbol specs.
 * V1 only has resistors, so this union is currently one member.
 */
export type SymbolSpec = RectResistorSpec;

/**
 * ComponentType is the "class" of a component (resistor, capacitor, etc.).
 * Instances live in EditorState and reference a ComponentType by typeId.
 */
export interface ComponentType {
  /** Unique registry ID (e.g. "resistor") */
  typeId: string;

  /** Human-friendly name for UI (e.g. "Resistor") */
  displayName: string;

  /**
   * Default parameters for new placements.
   * (Later: you might move from Record<string, number> to a typed params model per component.)
   */
  defaultParams(): Record<string, number>;

  /** Return the symbol geometry spec used by the renderer. */
  symbolSpec(): SymbolSpec;

  /** Port definitions in local component space (before rotation/translation). */
  ports(): PortDef[];

  /** Bounding box in local component space (used for hit testing). */
  bbox(): BBox;

  /**
   * Render this component instance.
   * Rendering should not mutate the instance or global state.
   */
  render(view: SchematicSvg, inst: ComponentInstance, opts?: RenderOpts): void;

  /**
   * Port positions in world space (after applying rotation + translation).
   * Used by wiring logic / snapping / debug overlays.
   */
  portWorldPositions(inst: ComponentInstance): { name: string; pos: Point }[];
}
