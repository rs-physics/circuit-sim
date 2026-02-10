// src/app/renderAll.ts
import type { Grid, Point } from "../editor/grid";
import type { ComponentInstance, RotationDeg } from "../editor/types";
import type { EditorState } from "../editor/state";
import type { SchematicSvg } from "../render/schematicSvg";
import { getComponentType } from "../editor/registry";
import type { Camera } from "../editor/camera";

/**
 * renderAll is the single draw pipeline for the editor.
 * It is intentionally "dumb":
 * - it does not mutate state
 * - it does not handle input
 * - it just renders the current state + tool previews
 *
 * This keeps the App easy to reason about: state changes happen elsewhere,
 * then renderAll draws whatever the current truth is.
 */
export type RenderAllDeps = {
  view: SchematicSvg;
  grid: Grid;
  state: EditorState;

  // camera
  camera: Camera;

  // debug overlay
  showDebug: boolean;

  // wire tool preview
  isWireMode: boolean;
  wireStart: Point | null;
  wirePreviewEnd: Point | null;
  manhattanSegments: (a: Point, b: Point) => { a: Point; b: Point }[];

  // component placement preview
  isPlaceMode: boolean;
  isMouseOverCanvas: boolean;
  activeTypeId: string;
  previewPos: Point;
  previewRotation: RotationDeg;

  // reroute preview wires (while dragging components with attached wires)
  dragWirePreview: { a: Point; b: Point }[];
};

export function renderAll(deps: RenderAllDeps) {
  const {
    view,
    grid,
    state,
    camera,

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

    dragWirePreview,
  } = deps;

  // ---------------------------------------------------------------------------
  // 1) Frame setup: viewbox + clear
  // ---------------------------------------------------------------------------
  view.setViewBox(camera);
  view.clear();
  view.clearDebug();

  // In V1 we redraw the grid every frame. Fine for now.
  view.drawGrid(grid.size);

  // Convenience flags used in multiple places below
  const hasSelection = state.selection !== null;
  const isPlacementPreviewVisible = isPlaceMode && isMouseOverCanvas;

  // ---------------------------------------------------------------------------
  // 2) Wires (existing)
  // ---------------------------------------------------------------------------
  for (const w of state.wires) {
    const selected =
      hasSelection &&
      state.selection!.kind === "wire" &&
      state.selection!.id === w.id;

    view.drawWireSegment(w, { selected });
  }

  // ---------------------------------------------------------------------------
  // 3) Wire tool preview (manhattan segments from wireStart -> wirePreviewEnd)
  // ---------------------------------------------------------------------------
  if (isWireMode && wireStart && wirePreviewEnd) {
    const segs = manhattanSegments(wireStart, wirePreviewEnd);
    for (const s of segs) view.drawWireSegment(s, { preview: true });
  }

  // ---------------------------------------------------------------------------
  // 4) Components (existing)
  // ---------------------------------------------------------------------------
  for (const inst of state.components) {
    const t = getComponentType(inst.typeId);

    const selected =
      hasSelection &&
      state.selection!.kind === "component" &&
      state.selection!.id === inst.id;

    t.render(view, inst, { selected });
  }

  // ---------------------------------------------------------------------------
  // 5) Reroute preview wires (drawn while dragging a component)
  // ---------------------------------------------------------------------------
  for (const s of dragWirePreview) {
    view.drawWireSegment(s, { preview: true });
  }

  // ---------------------------------------------------------------------------
  // 6) Placement preview instance (used for both preview symbol + preview ports)
  // ---------------------------------------------------------------------------
  let previewInst: ComponentInstance | null = null;
  if (isPlacementPreviewVisible) {
    const t = getComponentType(activeTypeId);
    previewInst = {
      id: "__preview__", // not a real persisted component
      typeId: activeTypeId,
      pos: previewPos,
      rotation: previewRotation,
      params: t.defaultParams(),
    };
  }

  // ---------------------------------------------------------------------------
  // 7) Debug overlay (ports)
  // ---------------------------------------------------------------------------
  if (showDebug) {
    // Existing component ports
    for (const inst of state.components) {
      const t = getComponentType(inst.typeId);
      for (const port of t.portWorldPositions(inst)) {
        view.drawDebugPortDot(port.pos, port.name);
      }
    }

    // Placement preview ports (only when preview is visible)
    if (previewInst) {
      const t = getComponentType(previewInst.typeId);
      for (const port of t.portWorldPositions(previewInst)) {
        view.drawDebugPortDot(port.pos, port.name);
      }
    }
  }

  // ---------------------------------------------------------------------------
  // 8) Placement preview symbol (ghost component)
  // ---------------------------------------------------------------------------
  if (previewInst) {
    const t = getComponentType(previewInst.typeId);
    t.render(view, previewInst, { preview: true });
  } else {
    // No preview needed: make sure any previous ghost is hidden
    view.hidePreview();
  }
}