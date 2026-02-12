import type { Point } from "../editor/grid";
import type { ComponentInstance, RotationDeg } from "../editor/types";
import type { EditorState } from "../editor/state";
import type { SchematicSvg } from "../render/schematicSvg";

/**
 * Single-mode model:
 * - "select" => selection / drag
 * - "wire"   => wire drawing
 * - otherwise (string) => placing that component typeId
 */
export type UiMode = "select" | "wire" | string;

const isWireMode = (m: UiMode) => m === "wire";
const isSelectMode = (m: UiMode) => m === "select";
const isPlaceMode = (m: UiMode) => !isSelectMode(m) && !isWireMode(m);

export type BindInputDeps = {
  view: SchematicSvg;
  doRender: () => void;

  // Convert browser client coords to SVG world coords
  clientPointToSvgPoint: (svg: SVGSVGElement, p: Point) => Point;

  // Camera controls (wheel zoom + panning)
  cam: {
    zoomAt: (worldPoint: Point, factor: number) => void;
    handleResize: () => void;
    isPanning: () => boolean;
    startPan: (e: PointerEvent) => void;
    updatePan: (e: PointerEvent) => void;
    endPan: () => void;
    panMoved: () => boolean;
  };

  // Mode (owned by App)
  getMode: () => UiMode;
  setMode: (m: UiMode) => void;

  // Wire-chain state (owned by App)
  wireStart: () => Point | null;
  setWireStart: (p: Point | null) => void;
  setWirePreviewEnd: (p: Point | null) => void;

  // Mouse hover state (owned by App)
  setIsMouseOverCanvas: (v: boolean) => void;

  // Place-mode preview state (owned by App)
  setPreviewPos: (p: Point) => void;

  // Geometry / snapping
  grid: { snap: (p: Point) => Point };
  manhattanSegments: (a: Point, b: Point) => { a: Point; b: Point }[];

  // Editor state (owned by App)
  state: EditorState;
  newId: () => string;
  normalizeWires: () => void;

  // Wire chain termination helpers
  isComponentPortPoint: (p: Point) => boolean;
  isPointOnWire: (p: Point) => boolean;

  // Hit testing for selection
  hitTest: (state: EditorState, p: Point) => any;

  // Drag/reroute ownership (owned by moveAndReroute system)
  getRerouteOwnerId: () => string | null;
  setRerouteOwnerId: (v: string | null) => void;
  commitReroutePreview: () => void;
  clearSelection: () => void;

  // Drag state (owned by moveAndReroute system)
  hasMoveDrag: () => boolean;
  moveDragActive: () => boolean;
  clearMoveDrag: () => void;
  setMoveDragNull: () => void; // legacy name; means "cancel drag now"

  // Drag actions (owned by moveAndReroute system)
  beginRerouteForSelectedComponent: (id: string) => void;
  startDrag: (id: string, pointerWorld: Point) => void;
  updateDrag: (pointerWorld: Point) => void;

  // Commands
  deleteSelection: () => void;
  rotateSelection: () => void;

  // Debug + preview rotation (keyboard)
  getShowDebug: () => boolean;
  setShowDebug: (v: boolean) => void;
  getPreviewRotation: () => RotationDeg;
  setPreviewRotation: (r: RotationDeg) => void;

  // Placement data
  isMouseOverCanvas: () => boolean;
  activeTypeId: () => string;
  previewPos: () => Point;
  previewRotation: () => RotationDeg;
  getComponentType: (typeId: string) => { defaultParams: () => any };
};

export function bindInput(deps: BindInputDeps) {
  const { view } = deps;

  /**
   * Convenience helper: convert a mouse/pointer event into SVG world coords.
   */
  const toSvgPoint = (e: { clientX: number; clientY: number }): Point => {
    return deps.clientPointToSvgPoint(view.svg, { x: e.clientX, y: e.clientY });
  };

  // ---------------------------------------------------------------------------
  // Wheel: zoom
  // ---------------------------------------------------------------------------
  view.svg.addEventListener(
    "wheel",
    (e: WheelEvent) => {
      e.preventDefault();

      const mouse = toSvgPoint(e);
      const zoomFactor = e.deltaY < 0 ? 0.9 : 1.1;

      deps.cam.zoomAt(mouse, zoomFactor);

      requestAnimationFrame(() => {
        deps.cam.handleResize();
        deps.doRender();
      });
    },
    { passive: false }
  );

  // ---------------------------------------------------------------------------
  // Context menu (right click): cancel / exit modes and deselect
  // ---------------------------------------------------------------------------
  view.svg.addEventListener("contextmenu", (e: MouseEvent) => {
    if (e.shiftKey) return; // allow Shift+RightClick for devtools
    e.preventDefault();

    const mode = deps.getMode();

    // Place mode: right-click exits to select
    if (isPlaceMode(mode)) {
      deps.setMode("select");
      deps.doRender();
      return;
    }

    // Wire mode:
    // - if a chain is in progress: right-click ends the chain
    // - otherwise: right-click exits wire mode (back to select)
    if (isWireMode(mode)) {
      if (deps.wireStart()) {
        deps.setWireStart(null);
        deps.setWirePreviewEnd(null);
        deps.doRender();
        return;
      }

      deps.setMode("select");
      deps.doRender();
      return;
    }

    // Select mode: right-click deselects anything selected
    deps.clearSelection();
    deps.doRender();
  });

  // ---------------------------------------------------------------------------
  // Mouse leave: clear hover previews
  // ---------------------------------------------------------------------------
  view.svg.addEventListener("mouseleave", () => {
    deps.setIsMouseOverCanvas(false);
    deps.setWirePreviewEnd(null);
    deps.doRender();
  });

  // ---------------------------------------------------------------------------
  // Mouse move: update place preview position / wire preview end
  // ---------------------------------------------------------------------------
  view.svg.addEventListener("mousemove", (e: MouseEvent) => {
    if (deps.cam.isPanning()) return;

    const svgPoint = toSvgPoint(e);
    const inside = view.isInsideCanvas(svgPoint);

    deps.setIsMouseOverCanvas(inside);

    const mode = deps.getMode();

    if (!inside) {
      if (isPlaceMode(mode) || isWireMode(mode)) deps.doRender();
      return;
    }

    const snapped = deps.grid.snap(svgPoint);

    if (isPlaceMode(mode)) {
      deps.setPreviewPos(snapped);
      deps.doRender();
      return;
    }

    if (isWireMode(mode)) {
      deps.setWirePreviewEnd(snapped);
      deps.doRender();
      return;
    }
  });

  // ---------------------------------------------------------------------------
  // Pointer down: main interaction entry point
  // ---------------------------------------------------------------------------
  view.svg.addEventListener("pointerdown", (e: PointerEvent) => {
    // Middle mouse: pan always
    if (e.button === 1) {
      deps.cam.startPan(e);
      e.preventDefault();
      return;
    }

    // Left only from here
    if (e.button !== 0) return;

    const svgPoint = toSvgPoint(e);
    const mode = deps.getMode();

    // -------------------------
    // WIRE MODE
    // -------------------------
    if (isWireMode(mode)) {
      if (!view.isInsideCanvas(svgPoint)) return;

      const p = deps.grid.snap(svgPoint);
      const onPort = deps.isComponentPortPoint(p);
      const onWire = deps.isPointOnWire(p);

      const start = deps.wireStart();

      // First click sets the start point
      if (!start) {
        deps.setWireStart(p);
        deps.setWirePreviewEnd(p);
        deps.doRender();
        e.preventDefault();
        return;
      }

      // Subsequent clicks add segments using manhattan routing
      const segs = deps.manhattanSegments(start, p);
      for (const s of segs) {
        if (s.a.x === s.b.x && s.a.y === s.b.y) continue;
        deps.state.wires.push({ id: deps.newId(), a: s.a, b: s.b });
      }
      deps.normalizeWires();

      // End chain if clicked a port or existing wire; else continue
      if (onPort || onWire) {
        deps.setWireStart(null);
        deps.setWirePreviewEnd(null);
      } else {
        deps.setWireStart(p);
        deps.setWirePreviewEnd(p);
      }

      deps.doRender();
      e.preventDefault();
      return;
    }

    // -------------------------
    // SELECTION + DRAG MODE
    // -------------------------
    if (isSelectMode(mode)) {
      if (view.isInsideCanvas(svgPoint)) {
        const hit = deps.hitTest(deps.state, svgPoint);

        // Empty space: treat as pan-drag
        if (!hit) {
          deps.cam.startPan(e);
          e.preventDefault();
          return;
        }

        // Commit reroute preview if clicking away from owner
        const rerouteOwnerId = deps.getRerouteOwnerId();
        if (rerouteOwnerId && (hit.kind !== "component" || hit.id !== rerouteOwnerId)) {
          deps.commitReroutePreview();
          deps.setRerouteOwnerId(null);
          deps.setMoveDragNull();
        }

        deps.state.selection = hit;

        if (hit.kind === "component") {
          if (deps.getRerouteOwnerId() !== hit.id) {
            deps.beginRerouteForSelectedComponent(hit.id);
          }

          deps.startDrag(hit.id, svgPoint);
          view.svg.setPointerCapture(e.pointerId);

          deps.doRender();
          e.preventDefault();
          return;
        }

        deps.doRender();
        e.preventDefault();
        return;
      }

      // Click outside canvas: clear selection
      deps.clearSelection();
      deps.doRender();
      e.preventDefault();
      return;
    }

    // -------------------------
    // PLACEMENT MODE (mode is a component typeId)
    // -------------------------
    if (!deps.isMouseOverCanvas()) return;

    const typeId = deps.activeTypeId();
    const t = deps.getComponentType(typeId);

    const inst: ComponentInstance = {
      id: deps.newId(),
      typeId,
      pos: deps.previewPos(),
      rotation: deps.previewRotation(),
      params: t.defaultParams(),
    };

    deps.state.components.push(inst);
    // splice into any wire under the ports (and re-normalize)
    deps.normalizeWires();

    deps.clearSelection();
    deps.doRender();
    e.preventDefault();
  });

  // ---------------------------------------------------------------------------
  // Pointer move: pan or component dragging
  // ---------------------------------------------------------------------------
  view.svg.addEventListener("pointermove", (e: PointerEvent) => {
    if (deps.cam.isPanning()) {
      deps.cam.updatePan(e);
      deps.doRender();
      e.preventDefault();
      return;
    }

    // Don’t drag components while placing components
    if (isPlaceMode(deps.getMode())) return;

    if (!deps.hasMoveDrag()) return;

    const svgPoint = toSvgPoint(e);
    deps.updateDrag(svgPoint);
    e.preventDefault();
  });

  // ---------------------------------------------------------------------------
  // Pointer up: finish pan or finish component drag
  // ---------------------------------------------------------------------------
  view.svg.addEventListener("pointerup", (e: PointerEvent) => {
    if (deps.cam.isPanning()) {
      const wasMoved = deps.cam.panMoved();
      deps.cam.endPan();

      if (!wasMoved) {
        deps.clearSelection();
      }

      deps.doRender();
      e.preventDefault();
      return;
    }

    if (!deps.moveDragActive()) return;

    deps.clearMoveDrag();

    try {
      view.svg.releasePointerCapture(e.pointerId);
    } catch {
      // ignore
    }

    deps.doRender();
    e.preventDefault();
  });

  // ---------------------------------------------------------------------------
  // Keyboard shortcuts (global)
  // ---------------------------------------------------------------------------
  const onKeyDown = (e: KeyboardEvent) => {
    const k = e.key.toLowerCase();
    const mode = deps.getMode();

    // Escape: cancel wire chain or exit wire mode (back to select)
    if (k === "escape") {
      if (isWireMode(mode)) {
        deps.setWireStart(null);
        deps.setWirePreviewEnd(null);
        deps.setMode("select");
        return;
      }
      if (isPlaceMode(mode)) {
        deps.setMode("select");
        return;
      }
    }

    // W: toggle wire mode
    if (k === "w") {
      deps.setMode(isWireMode(mode) ? "select" : "wire");
      return;
    }

    // Delete/Backspace: delete selected (except during placement)
    if (k === "delete" || k === "backspace") {
      if (isPlaceMode(mode)) return;
      deps.deleteSelection();
      e.preventDefault();
      return;
    }

    // D: toggle debug overlay
    if (k === "d") {
      deps.setShowDebug(!deps.getShowDebug());
      deps.doRender();
      return;
    }

    // R: rotate (preview in place mode; selected component otherwise)
    if (k === "r") {
      if (isPlaceMode(mode)) {
        deps.setPreviewRotation(((deps.getPreviewRotation() + 90) % 360) as RotationDeg);
        deps.doRender();
      } else {
        deps.rotateSelection();
      }
      return;
    }
  };

  window.addEventListener("keydown", onKeyDown);

  /**
   * Note:
   * If you ever create/destroy App multiple times in the same page session,
   * consider returning an "unbind" function that removes the window keydown listener.
   */
}
