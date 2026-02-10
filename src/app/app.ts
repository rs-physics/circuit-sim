import { Grid, type Point } from "../editor/grid";
import { clientPointToSvgPoint } from "../editor/snapping";
import type { RotationDeg } from "../editor/types";
import { EditorState } from "../editor/state";
import { getComponentType, listComponentTypes } from "../editor/registry";
import { SchematicSvg } from "../render/schematicSvg";
import { hitTest } from "../editor/hitTest";
import { normalizeAndSegmentWires } from "../editor/wireNormalize";
import { renderAll } from "./renderAll";
import { createCameraController } from "../editor/camera";
import { bindInput } from "./bindInput";
import { manhattanSegments } from "../editor/geom";
import { createMoveAndReroute } from "../editor/moveAndReroute";
import { createTempToolbar } from "../ui/tempToolbar";

/**
 * V1 uses UUIDs for everything. Works fine for an in-memory editor.
 * (If you later add save/load, you’ll keep these IDs stable across sessions.)
 */
function newId(): string {
  return crypto.randomUUID();
}

export class App {
  /**
   * App.start() is the top-level “wiring harness”.
   * It:
   * - creates UI + canvas
   * - constructs editor state + camera
   * - defines mode state + helper actions
   * - binds input (pointer + keyboard)
   * - renders initial frame
   *
   * Important: App does NOT do heavy interaction logic itself anymore.
   * Drag/reroute is owned by moveAndReroute; pointer/keyboard events are owned by bindInput.
   */
  start() {
    // -----------------------------
    // 1) Host bootstrapping
    // -----------------------------
    const host = document.querySelector<HTMLDivElement>("#app");
    if (!host) throw new Error("Missing #app element");

    host.innerHTML = "";
    host.style.width = "100%";
    host.style.height = "100vh";

    // -----------------------------
    // 2) Component registry (data for UI + placement)
    // -----------------------------
    const availableTypes = listComponentTypes();
    if (availableTypes.length === 0) throw new Error("No component types registered.");

    // Which component type we place in place-mode.
    let activeTypeId = availableTypes[0].typeId;

    // -----------------------------
    // 3) Temporary UI scaffold (will be replaced later)
    // -----------------------------
    const ui = createTempToolbar(host, availableTypes);
    ui.selComponentType.value = activeTypeId;
    ui.setWireLabel(false);
    ui.setPlaceLabel(false);

    // -----------------------------
    // 4) Core editor state + view/camera
    // -----------------------------
    const state = new EditorState();

    const grid = new Grid(25);
    const view = new SchematicSvg(ui.canvasHost);

    // Hard-coded world bounds for V1 (fine for now).
    // Later: compute from content bounds or make this infinite.
    const WORLD_BOUNDS = { x: 0, y: 0, width: 1200, height: 800 };
    const cam = createCameraController(view.svg, WORLD_BOUNDS);

    // Prevent middle mouse click from opening browser auto-scroll UI.
    view.svg.addEventListener("auxclick", (e) => {
      if ((e as MouseEvent).button === 1) e.preventDefault();
    });
    view.svg.addEventListener("mousedown", (e) => {
      if ((e as MouseEvent).button === 1) e.preventDefault();
    });

    // -----------------------------
    // 5) Tool / interaction state (ephemeral UI state)
    // -----------------------------
    let isPlaceMode = false;
    let isWireMode = false;
    let isMouseOverCanvas = false;

    // Place-mode preview
    let previewRotation: RotationDeg = 0;
    let previewPos: Point = { x: 0, y: 0 };

    // Wire-mode chain state
    let wireStart: Point | null = null;
    let wirePreviewEnd: Point | null = null;

    // Debug overlay toggle (ports / hit boxes etc.)
    let showDebug = true;

    // -----------------------------
    // 6) Small “actions” that mutate state (App-level commands)
    // -----------------------------

    /**
     * Keeps the “Place Component” button label synced with:
     * - whether we’re in place mode
     * - which component type is active
     */
    const updatePlaceButtonText = () => {
      if (!isPlaceMode) {
        ui.setPlaceLabel(false);
        return;
      }

      const t = getComponentType(activeTypeId);
      ui.setPlaceLabel(true, t.displayName);
    };

    /**
     * Normalise wire geometry: merges collinear segments, splits overlaps, etc.
     * This is called after any operation that edits wires.
     */
    const normalizeWires = () => {
      state.wires = normalizeAndSegmentWires(state.wires);
    };

    /**
     * Delete whatever is currently selected.
     * (Place mode ignores delete/backspace because you’re not “editing”, you’re “placing”.)
     */
    const deleteSelection = () => {
      const sel = state.selection;
      if (!sel) return;

      switch (sel.kind) {
        case "component": {
          state.components = state.components.filter((c) => c.id !== sel.id);
          move?.clearSelection(); // defensive; move exists after construction
          doRender();
          return;
        }

        case "wire": {
          state.wires = state.wires.filter((w) => w.id !== sel.id);
          normalizeWires();
          move?.clearSelection();
          doRender();
          return;
        }
      }
    };

    /**
     * Rotate selected component by +90 degrees.
     * (Preview rotation is handled by bindInput via setPreviewRotation.)
     */
    const rotateSelection = () => {
      const sel = state.selection;
      if (!sel) return;

      if (sel.kind !== "component") return;

      const inst = state.components.find((c) => c.id === sel.id);
      if (!inst) {
        move?.clearSelection();
        doRender();
        return;
      }

      inst.rotation = (((inst.rotation + 90) % 360) as RotationDeg);
      doRender();
    };

    /**
     * Helper: is a snapped point exactly on any component port?
     * Used to decide whether a wire chain should terminate.
     */
    const isComponentPortPoint = (p: Point): boolean => {
      for (const inst of state.components) {
        const t = getComponentType(inst.typeId);
        for (const port of t.portWorldPositions(inst)) {
          if (port.pos.x === p.x && port.pos.y === p.y) return true;
        }
      }
      return false;
    };

    /**
     * Helper: is a snapped point on any wire segment (axis-aligned only in V1)?
     * Used to terminate wire chains when clicking onto existing wires.
     */
    const isPointOnWire = (p: Point): boolean => {
      for (const w of state.wires) {
        // vertical segment
        if (w.a.x === w.b.x) {
          if (p.x !== w.a.x) continue;
          const minY = Math.min(w.a.y, w.b.y);
          const maxY = Math.max(w.a.y, w.b.y);
          if (p.y >= minY && p.y <= maxY) return true;
        }

        // horizontal segment
        else if (w.a.y === w.b.y) {
          if (p.y !== w.a.y) continue;
          const minX = Math.min(w.a.x, w.b.x);
          const maxX = Math.max(w.a.x, w.b.x);
          if (p.x >= minX && p.x <= maxX) return true;
        }
      }
      return false;
    };

    /**
     * Mode toggles are App-owned because they affect:
     * - cursor style
     * - what a click does
     * - which state gets cleared
     */
    const setPlaceMode = (enabled: boolean) => {
      isPlaceMode = enabled;

      if (enabled) {
        // Place mode and wire mode are mutually exclusive
        isWireMode = false;
        ui.setWireLabel(false);

        // Cancel any in-progress wire chain
        wireStart = null;
        wirePreviewEnd = null;

        // Leaving selection state helps avoid "placing while something selected"
        move?.clearSelection();

        view.svg.style.cursor = "default";
      }

      updatePlaceButtonText();
      doRender();
    };

    const setWireMode = (enabled: boolean) => {
      isWireMode = enabled;

      if (enabled) {
        // Wire mode and place mode are mutually exclusive
        isPlaceMode = false;

        move?.clearSelection();

        wireStart = null;
        wirePreviewEnd = null;

        view.svg.style.cursor = "crosshair";
        ui.setWireLabel(true);
        updatePlaceButtonText();
      } else {
        wireStart = null;
        wirePreviewEnd = null;

        view.svg.style.cursor = "default";
        ui.setWireLabel(false);
      }

      doRender();
    };

    // -----------------------------
    // 7) Render function (single source of truth for drawing)
    // -----------------------------
    // IMPORTANT: doRender exists before move is created, so we use a `let move` declared below.
    // moveAndReroute will call requestRender() during drag updates.
    let move: ReturnType<typeof createMoveAndReroute> | null = null;

    const doRender = () => {
      renderAll({
        view,
        grid,
        state,
        camera: cam.getCamera(),

        showDebug,

        isWireMode,
        wireStart,
        wirePreviewEnd,
        manhattanSegments,

        isPlaceMode,
        isMouseOverCanvas,
        activeTypeId,
        previewPos,
        previewRotation,

        // Preview wires used while dragging a component with attached wires
        dragWirePreview: move ? move.dragWirePreview() : [],
      });
    };

    // -----------------------------
    // 8) Construct reroute/drag system (owns drag+reroute state machine)
    // -----------------------------
    move = createMoveAndReroute({
      state,
      grid,
      view,
      getComponentType,
      newId,
      normalizeWires,
      requestRender: doRender,
    });

    // -----------------------------
    // 9) UI event wiring
    // -----------------------------
    ui.btnWire.addEventListener("click", () => setWireMode(!isWireMode));

    ui.selComponentType.addEventListener("change", () => {
      activeTypeId = ui.selComponentType.value;
      updatePlaceButtonText();
      doRender();
    });

    ui.btnPlaceComponent.addEventListener("click", () => {
      setPlaceMode(!isPlaceMode);
    });

    // -----------------------------
    // 10) Pointer + keyboard input wiring
    // -----------------------------
    bindInput({
      view,
      doRender,
      cam,
      clientPointToSvgPoint,

      // mode controls
      isPlaceMode: () => isPlaceMode,
      setPlaceMode,
      isWireMode: () => isWireMode,
      setWireMode,

      // wire chain state (wire mode)
      wireStart: () => wireStart,
      setWireStart: (p) => {
        wireStart = p;
      },
      setWirePreviewEnd: (p) => {
        wirePreviewEnd = p;
      },

      // place-mode hover state
      setIsMouseOverCanvas: (v) => {
        isMouseOverCanvas = v;
      },
      setPreviewPos: (p) => {
        previewPos = p;
      },

      // editor / geometry deps
      grid,
      state,
      newId,
      normalizeWires,
      isComponentPortPoint,
      isPointOnWire,
      manhattanSegments,
      hitTest,
      getComponentType,

      // reroute/drag system (single source of truth)
      getRerouteOwnerId: move.getRerouteOwnerId,
      setRerouteOwnerId: move.setRerouteOwnerId,
      commitReroutePreview: move.commitReroutePreview,
      clearSelection: move.clearSelection,

      // drag state queries for pointermove/pointerup
      setMoveDragNull: move.clearMoveDrag,
      hasMoveDrag: move.hasMoveDrag,
      moveDragActive: move.moveDragActive,
      clearMoveDrag: move.clearMoveDrag,

      // drag actions
      beginRerouteForSelectedComponent: move.beginRerouteForSelectedComponent,
      startDrag: move.startDrag,
      updateDrag: move.updateDrag,

      // placement data
      isMouseOverCanvas: () => isMouseOverCanvas,
      activeTypeId: () => activeTypeId,
      previewPos: () => previewPos,
      previewRotation: () => previewRotation,

      // command-style actions
      deleteSelection,
      rotateSelection,

      // debug + preview rotation (keyboard toggles)
      getShowDebug: () => showDebug,
      setShowDebug: (v) => {
        showDebug = v;
      },

      getPreviewRotation: () => previewRotation,
      setPreviewRotation: (r) => {
        previewRotation = r;
      },
    });

    // -----------------------------
    // 11) Start
    // -----------------------------
    updatePlaceButtonText();
    doRender();
    console.log("Component system: V1 editor booted.");
  }
}