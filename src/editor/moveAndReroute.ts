import type { Point } from "./grid";
import type { ComponentInstance } from "./types";
import type { EditorState } from "./state";
import { manhattanFromFixed } from "./geom";

/**
 * When dragging a component, we temporarily "detach" any wire segments
 * that were connected to its ports.
 *
 * We store for each detached wire:
 * - fixed: the non-moving end (stays in world space)
 * - incomingAxis: the orientation of the original segment ("h" or "v")
 * - portOffset: where the port is relative to the component origin
 *
 * While dragging, we render a preview path from each fixed end to the
 * component's moving port position (manhattan routed).
 */
export type DragWireAttachment = {
  fixed: Point;
  incomingAxis: "h" | "v";
  portOffset: Point; // port local position relative to inst.pos
};

type WireSeg = { a: Point; b: Point };

type MoveAndRerouteDeps = {
  state: EditorState;
  grid: { snap: (p: Point) => Point };
  view: { isInsideCanvas: (p: Point) => boolean };

  // We only need the bits of ComponentType we use here
  getComponentType: (typeId: string) => {
    portWorldPositions: (inst: ComponentInstance) => { name: string; pos: Point }[];
  };

  newId: () => string;
  normalizeWires: () => void;

  // Rendering callback (App owns actual renderAll call)
  requestRender: () => void;
};

/**
 * This module owns the "move drag" + "reroute preview" logic.
 *
 * Key idea:
 * - When you click a component, we remove any attached wire segments from state.wires
 * - We replace them with a live preview (dragWirePreview)
 * - When the user clicks away / clears selection, we commit the preview back into state.wires
 */
export function createMoveAndReroute(deps: MoveAndRerouteDeps) {
  // Which component currently "owns" the reroute preview (if any)
  let rerouteOwnerId: string | null = null;

  // All wires that were detached from the reroute owner
  let rerouteAttachments: DragWireAttachment[] = [];

  // The current reroute preview segments to draw (world space)
  let dragWirePreview: WireSeg[] = [];

  // Current move drag state (null when not dragging)
  let moveDrag:
    | {
        id: string;
        offset: Point; // inst.pos - pointerWorld
      }
    | null = null;

  // ---------------------------------------------------------------------------
  // Preview building
  // ---------------------------------------------------------------------------

  /**
   * Rebuild preview segments for the current attachments, based on the component's
   * current position (during drag).
   */
  const rebuildReroutePreview = (inst: ComponentInstance, attachments: DragWireAttachment[]) => {
    const preview: WireSeg[] = [];

    for (const a of attachments) {
      const portPos: Point = {
        x: inst.pos.x + a.portOffset.x,
        y: inst.pos.y + a.portOffset.y,
      };

      preview.push(...manhattanFromFixed(a.fixed, portPos, a.incomingAxis));
    }

    dragWirePreview = preview;
  };

  // ---------------------------------------------------------------------------
  // Begin reroute session (detach wires)
  // ---------------------------------------------------------------------------

  /**
   * Start a reroute session for a selected component:
   * - find any wire segments that touch its ports
   * - remove those segments from state.wires
   * - store attachments so we can generate preview routes during drag
   */
  const beginRerouteForSelectedComponent = (id: string) => {
    const inst = deps.state.components.find((c) => c.id === id);
    if (!inst) return;

    const attachments: DragWireAttachment[] = [];

    const type = deps.getComponentType(inst.typeId);
    const ports = type.portWorldPositions(inst);

    // For each port, find wire segments that connect to that exact point
    for (const port of ports) {
      for (let i = deps.state.wires.length - 1; i >= 0; i--) {
        const w = deps.state.wires[i];

        const isA = w.a.x === port.pos.x && w.a.y === port.pos.y;
        const isB = w.b.x === port.pos.x && w.b.y === port.pos.y;
        if (!isA && !isB) continue;

        // Fixed end is the non-port end
        const fixed = isA ? w.b : w.a;

        // Orientation of the existing segment (V1 is axis-aligned)
        const incomingAxis: "h" | "v" = w.a.y === w.b.y ? "h" : "v";

        attachments.push({
          fixed,
          incomingAxis,
          portOffset: {
            x: port.pos.x - inst.pos.x,
            y: port.pos.y - inst.pos.y,
          },
        });

        // Remove the old segment; the preview replaces it while dragging
        deps.state.wires.splice(i, 1);
      }
    }

    rerouteOwnerId = id;
    rerouteAttachments = attachments;

    rebuildReroutePreview(inst, attachments);
    deps.requestRender();
  };

  // ---------------------------------------------------------------------------
  // Dragging
  // ---------------------------------------------------------------------------

  /**
   * Begin a movement drag on a component.
   * If the reroute session doesn't exist yet, we initialise it.
   */
  const startDrag = (id: string, pointerWorld: Point) => {
    const inst = deps.state.components.find((c) => c.id === id);
    if (!inst) return;

    if (rerouteOwnerId !== id) {
      beginRerouteForSelectedComponent(id);
    }

    moveDrag = {
      id,
      offset: {
        x: inst.pos.x - pointerWorld.x,
        y: inst.pos.y - pointerWorld.y,
      },
    };
  };

  /**
   * Update movement drag:
   * - snap new position
   * - rebuild preview if this component owns reroute session
   */
    const updateDrag = (pointerWorld: Point) => {
        const drag = moveDrag;
        if (!drag) return;

        const inst = deps.state.components.find((c) => c.id === drag.id);
        if (!inst) return;

        const target: Point = {
            x: pointerWorld.x + drag.offset.x,
            y: pointerWorld.y + drag.offset.y,
        };

        const snapped = deps.grid.snap(target);
        if (!deps.view.isInsideCanvas(snapped)) return;

        inst.pos = snapped;

        if (rerouteOwnerId === drag.id) {
            rebuildReroutePreview(inst, rerouteAttachments);
        }

        deps.requestRender();
    };


  // ---------------------------------------------------------------------------
  // Commit / cleanup
  // ---------------------------------------------------------------------------

  /**
   * Turn the preview segments into real wires again.
   * Called when clearing selection / clicking away from the reroute owner.
   */
  const commitReroutePreview = () => {
    if (dragWirePreview.length === 0) return;

    for (const s of dragWirePreview) {
      // Skip degenerate zero-length segments
      if (s.a.x === s.b.x && s.a.y === s.b.y) continue;

      deps.state.wires.push({
        id: deps.newId(),
        a: s.a,
        b: s.b,
      });
    }

    // Normalise wires once at the end (merge colinear, segment, etc.)
    deps.normalizeWires();

    dragWirePreview = [];
  };

  /**
   * Clear selection-like state owned by this module:
   * - commit preview wires back into state.wires
   * - reset reroute session
   * - cancel active move drag
   * - clear editor selection
   */
  const clearSelection = () => {
    commitReroutePreview();

    rerouteOwnerId = null;
    rerouteAttachments = [];
    dragWirePreview = [];

    moveDrag = null;

    deps.state.selection = null;
  };

  // ---------------------------------------------------------------------------
  // Public API
  // ---------------------------------------------------------------------------

  return {
    // reroute session
    beginRerouteForSelectedComponent,
    commitReroutePreview,
    clearSelection,

    // drag operations
    startDrag,
    updateDrag,

    // drag state flags
    moveDragActive: () => !!moveDrag,
    hasMoveDrag: () => moveDrag !== null,
    clearMoveDrag: () => {
      moveDrag = null;
    },

    // reroute ownership getters/setters (used by bindInput)
    getRerouteOwnerId: () => rerouteOwnerId,
    setRerouteOwnerId: (v: string | null) => {
      rerouteOwnerId = v;
    },

    // read-only preview for renderAll
    dragWirePreview: () => dragWirePreview,
  };
}
