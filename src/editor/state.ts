import type { ComponentInstance, WireSegment } from "./types";
import type { Selection } from "./selection";

/**
 * EditorState
 *
 * Holds the current editable schematic data + UI selection.
 * This is NOT simulation state (no voltages/currents yet), just the drawing model.
 *
 * V1 assumptions:
 * - components and wires are simple arrays
 * - selection is a single item (or null)
 */
export class EditorState {
  /** All placed component instances (resistors, later caps, sources, etc.) */
  components: ComponentInstance[] = [];

  /** All wire segments in world space (V1: axis-aligned segments) */
  wires: WireSegment[] = [];

  /** Current editor selection (or null) */
  selection: Selection = null;
}