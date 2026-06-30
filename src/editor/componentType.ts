import type { ComponentInstance, PortDef, BBox } from "./types";
import type { Point } from "./grid";
import type { SchematicSvg } from "../render/schematicSvg";
import type { SimRole } from "../sim/simRole";
import type { SimState } from "../sim/simState";
import type { SymbolRotationMode } from "../render/readableRotation";

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

export type SymbolSpecBase = {
  /**
   * Controls visual rotation only.
   *
   * "full" = draw at true component rotation.
   * "readable" = draw 180° components upright, while ports/simulation still use true rotation.
   *
   * If omitted, renderer should treat it as "full".
   */
  rotationMode?: SymbolRotationMode;
};

export type RectResistorSpec = {
  kind: "rectResistor";
  bodyW: number;
  bodyH: number;
  lead: number;
};

export type BatterySpec = {
  kind: "battery";
  lead: number;      // lead length on each side
  plateGap: number;  // distance between the two plates
  longPlate: number; // height of the long plate
  shortPlate: number;// height of the short plate
};

export type BulbSpec = {
  kind: "bulb";
  lead: number;
  radius: number;
};

export type CapacitorSpec = {
  kind: "capacitor";
  lead: number;       // lead length from plate to port
  plateGap: number;   // gap between the two plates
  plateH: number;     // plate height
};

export type SwitchSpec = {
  kind: "switch";
  lead: number;       // from port to contact
  contactGap: number; // gap between contacts
  leverLen: number;   // length of lever arm
  leverRise: number;  // how "open" the switch looks (y offset)
};

export type VarResistorSpec = {
  kind: "varResistor";
  bodyW: number;
  bodyH: number;
  lead: number;
  arrowPad: number; // how far the arrow extends past body
};

export type ThermistorSpec = {
  kind: "thermistor";
  bodyW: number;
  bodyH: number;
  lead: number;
  slashPad: number; // how far the diagonal slash extends past body
};

export type LdrSpec = {
  kind: "ldr";
  bodyW: number;
  bodyH: number;
  lead: number;
  arrowPad: number; // distance from body to arrow tail
  arrowLen: number; // arrow length
};

export type DiodeSpec = {
  kind: "diode";
  lead: number;
  bodyW: number;
  bodyH: number;
  barW: number; // thickness of the cathode bar
};

export type LedSpec = {
  kind: "led";
  lead: number;
  bodyW: number;
  bodyH: number;
  barW: number;
  arrowPad: number; // distance from body to arrow tail
  arrowLen: number; // arrow length
};

export type AmmeterSpec = {
  kind: "ammeter";
  lead: number;
  radius: number;
};

export type VoltmeterSpec = {
  kind: "voltmeter";
  lead: number;
  radius: number;
};

/**
 * Union of all supported symbol specs.
 * As we add more components they are exported here.
 */
export type SymbolSpec = SymbolSpecBase & (
    | RectResistorSpec
    | BatterySpec
    | BulbSpec
    | CapacitorSpec
    | SwitchSpec
    | VarResistorSpec
    | ThermistorSpec
    | LdrSpec
    | DiodeSpec
    | LedSpec
    | AmmeterSpec
    | VoltmeterSpec
    );

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

  /**
   * Electrical role this component plays in simulation.
   *
   * Optional — components that don't implement this (e.g. decorative or
   * not-yet-simulated types) will be flagged to the user as unsupported
   * rather than silently ignored or crashing the solver.
   *
   * v2a: resistor, voltageSource implement this.
   * v2b: ammeter, voltmeter, nonLinearResistor (bulb, diode etc.)
   * v2c: capacitor (open circuit in DC steady state)
   */
  simRole?(inst: ComponentInstance): SimRole;

  /**
   * Text to display in a label above this component, drawn via
   * SchematicSvg.drawComponentLabel(). One shared rendering primitive
   * for all components — styling changes happen in one place — but each
   * type decides its own content here.
   *
   * Examples: a resistor returns its resistance ("100Ω"), a voltmeter
   * looks up its reading from simState and returns it ("9.00 V").
   *
   * Return null to show no label (e.g. a wire-only component, or a
   * voltmeter with no solved circuit yet).
   *
   * This is purely presentational/read-only. Editable parameter input
   * (e.g. clicking a resistor's value to change it) is a separate,
   * later concern — not handled here.
   */
  displayLabel?(inst: ComponentInstance, simState: SimState): string | null;
  displayLabelOffset?(inst: ComponentInstance): Point;
}