import type { Point } from "../editor/grid";
import type { ComponentInstance, RotationDeg } from "../editor/types";
import type { EditorState } from "../editor/state";
import type { SchematicSvg } from "../render/schematicSvg";

/**
 * Everything bindInput needs is injected so the module stays:
 * - dumb about overall architecture
 * - easy to refactor without reaching into globals
 * - reusable if you later swap renderers / UIs
 */
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

  // Modes (owned by App)
  isPlaceMode: () => boolean;
  setPlaceMode: (v: boolean) => void;

  isWireMode: () => boolean;
  setWireMode: (v: boolean) => void;

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
   * (This is the single most repeated piece of code in input handlers.)
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
      // Prevent page scrolling while hovering the SVG
      e.preventDefault();

      const mouse = toSvgPoint(e);
      const zoomFactor = e.deltaY < 0 ? 0.9 : 1.1;

      deps.cam.zoomAt(mouse, zoomFactor);
      // HACK: force the same “recalc/snap” that a resize triggers
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
    e.preventDefault();

    // Place mode: right-click exits place mode
    if (deps.isPlaceMode()) {
      deps.setPlaceMode(false);
      deps.doRender();
      return;
    }

    // Wire mode:
    // - if a chain is in progress: right-click ends the chain
    // - otherwise: right-click exits wire mode
    if (deps.isWireMode()) {
      if (deps.wireStart()) {
        deps.setWireStart(null);
        deps.setWirePreviewEnd(null);
        deps.doRender();
        return;
      }

      deps.setWireMode(false);
      deps.doRender();
      return;
    }

    // Normal mode: right-click deselects anything selected
    deps.clearSelection();
    deps.doRender();
  });

  // ---------------------------------------------------------------------------
  // Mouse leave: clear hover previews (place mode / wire mode)
  // ---------------------------------------------------------------------------
  view.svg.addEventListener("mouseleave", () => {
    deps.setIsMouseOverCanvas(false);
    deps.setWirePreviewEnd(null);
    deps.doRender();
  });

  // ---------------------------------------------------------------------------
  // Mouse move: update place-mode preview position / wire preview end
  // ---------------------------------------------------------------------------
  view.svg.addEventListener("mousemove", (e: MouseEvent) => {
    // If we’re panning, pointermove handles the updates. Don’t fight it.
    if (deps.cam.isPanning()) return;

    const svgPoint = toSvgPoint(e);
    const inside = view.isInsideCanvas(svgPoint);

    deps.setIsMouseOverCanvas(inside);

    // If the cursor leaves the world bounds, we only need to re-render
    // if a preview is currently visible.
    if (!inside) {
      if (deps.isPlaceMode() || deps.isWireMode()) deps.doRender();
      return;
    }

    const snapped = deps.grid.snap(svgPoint);

    if (deps.isPlaceMode()) {
      deps.setPreviewPos(snapped);
      deps.doRender();
      return;
    }

    if (deps.isWireMode()) {
      deps.setWirePreviewEnd(snapped);
      deps.doRender();
      return;
    }
  });

  // ---------------------------------------------------------------------------
  // Pointer down: main interaction entry point
  // - middle: pan
  // - left: wire / select+drag / place
  // ---------------------------------------------------------------------------
  view.svg.addEventListener("pointerdown", (e: PointerEvent) => {
    // Uncomment if you ever need to debug state again:
    // console.log("wire?", deps.isWireMode(), "place?", deps.isPlaceMode());

    // Middle mouse: pan always
    if (e.button === 1) {
      deps.cam.startPan(e);
      e.preventDefault();
      return;
    }

    // Left only from here
    if (e.button !== 0) return;

    const svgPoint = toSvgPoint(e);

    // -------------------------
    // WIRE MODE
    // -------------------------
    if (deps.isWireMode()) {
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

      // If we clicked a port or existing wire, end the chain.
      // Otherwise, continue the chain from the new point.
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
    // (i.e., not in place mode)
    // -------------------------
    if (!deps.isPlaceMode()) {
      if (view.isInsideCanvas(svgPoint)) {
        const hit = deps.hitTest(deps.state, svgPoint);

        // Empty space: treat as pan-drag
        if (!hit) {
          deps.cam.startPan(e);
          e.preventDefault();
          return;
        }

        // If we had a reroute preview active for some component,
        // and we click away from that component, commit the preview.
        const rerouteOwnerId = deps.getRerouteOwnerId();
        if (rerouteOwnerId && (hit.kind !== "component" || hit.id !== rerouteOwnerId)) {
          deps.commitReroutePreview();
          deps.setRerouteOwnerId(null);
          deps.setMoveDragNull();
        }

        // Select the hit thing
        deps.state.selection = hit;

        // Components can be dragged. Wires are selectable but not draggable (V1).
        if (hit.kind === "component") {
          // Ensure reroute session is initialised for this component
          if (deps.getRerouteOwnerId() !== hit.id) {
            deps.beginRerouteForSelectedComponent(hit.id);
          }

          deps.startDrag(hit.id, svgPoint);

          // Pointer capture ensures we still receive pointermove/up even
          // if the cursor leaves the SVG during drag.
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
    // PLACEMENT MODE
    // -------------------------
    if (!deps.isMouseOverCanvas()) return;

    const t = deps.getComponentType(deps.activeTypeId());

    const inst: ComponentInstance = {
      id: deps.newId(),
      typeId: deps.activeTypeId(),
      pos: deps.previewPos(),
      rotation: deps.previewRotation(),
      params: t.defaultParams(),
    };

    deps.state.components.push(inst);

    // Placing a component ends any existing selection / reroute session
    deps.clearSelection();

    deps.doRender();
    e.preventDefault();
  });

  // ---------------------------------------------------------------------------
  // Pointer move: pan or component dragging
  // ---------------------------------------------------------------------------
  view.svg.addEventListener("pointermove", (e: PointerEvent) => {
    // Panning takes priority; it should feel responsive even if other modes exist
    if (deps.cam.isPanning()) {
      deps.cam.updatePan(e);
      deps.doRender(); // ✅ needed for real-time pan updates
      e.preventDefault();
      return;
    }

    // Don’t drag components while placing components
    if (deps.isPlaceMode()) return;

    // If we are not currently dragging a component, ignore
    if (!deps.hasMoveDrag()) return;

    const svgPoint = toSvgPoint(e);
    deps.updateDrag(svgPoint);
    e.preventDefault();
  });

  // ---------------------------------------------------------------------------
  // Pointer up: finish pan or finish component drag
  // ---------------------------------------------------------------------------
  view.svg.addEventListener("pointerup", (e: PointerEvent) => {
    // End panning
    if (deps.cam.isPanning()) {
      const wasMoved = deps.cam.panMoved();
      deps.cam.endPan();

      // If the user clicked but didn't move, treat it like an empty-space click
      if (!wasMoved) {
        deps.clearSelection();
      }

      deps.doRender();
      e.preventDefault();
      return;
    }

    // End component drag
    if (!deps.moveDragActive()) return;

    deps.clearMoveDrag();

    try {
      view.svg.releasePointerCapture(e.pointerId);
    } catch {
      // releasePointerCapture can throw if capture wasn’t held; safe to ignore
    }

    deps.doRender();
    e.preventDefault();
  });

  // ---------------------------------------------------------------------------
  // Keyboard shortcuts (global)
  // ---------------------------------------------------------------------------
  const onKeyDown = (e: KeyboardEvent) => {
    const k = e.key.toLowerCase();

    // Escape: cancel wire chain or exit wire mode
    if (k === "escape") {
      if (deps.isWireMode()) {
        deps.setWireStart(null);
        deps.setWirePreviewEnd(null);
        deps.setWireMode(false);
        return;
      }
    }

    // W: toggle wire mode
    if (k === "w") {
      deps.setWireMode(!deps.isWireMode());
      return;
    }

    // Delete/Backspace: delete selected (except during placement)
    if (k === "delete" || k === "backspace") {
      if (deps.isPlaceMode()) return;
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
      if (deps.isPlaceMode()) {
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
   * For now (single App instance), this is fine.
   */
}
