// src/app/renderAll.ts
import type { Grid, Point } from "../editor/grid";
import type { ComponentInstance, RotationDeg } from "../editor/types";
import type { EditorState } from "../editor/state";
import type { SchematicSvg } from "../render/schematicSvg";
import { getComponentType } from "../editor/registry";
import type { Camera } from "../editor/camera";

export type RenderAllDeps = {
  view: SchematicSvg;
  grid: Grid;
  state: EditorState;

  // camera
  camera: Camera;

  // debug overlay
  showDebug: boolean;

  // mode (single source of truth)
  mode: "select" | "wire" | string;

  // wire tool preview
  wireStart: Point | null;
  wirePreviewEnd: Point | null;
  manhattanSegments: (a: Point, b: Point) => { a: Point; b: Point }[];

  // component placement preview
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

    mode,
    wireStart,
    wirePreviewEnd,
    manhattanSegments,

    isMouseOverCanvas,
    activeTypeId,
    previewPos,
    previewRotation,

    dragWirePreview,
  } = deps;

  const wireMode = mode === "wire";
  const placeMode = mode !== "select" && mode !== "wire";

  // ---------------------------------------------------------------------------
  // 1) Frame setup: viewbox + clear
  // ---------------------------------------------------------------------------
  view.setViewBox(camera);
  view.clear();
  view.clearDebug();

  view.drawGrid(grid.size);

  const hasSelection = state.selection !== null;
  const isPlacementPreviewVisible = placeMode && isMouseOverCanvas;

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
  // 3) Wire tool preview
  // ---------------------------------------------------------------------------
  if (wireMode && wireStart && wirePreviewEnd) {
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
  // 5) Reroute preview wires
  // ---------------------------------------------------------------------------
  for (const s of dragWirePreview) {
    view.drawWireSegment(s, { preview: true });
  }

  // ---------------------------------------------------------------------------
  // 6) Placement preview instance
  // ---------------------------------------------------------------------------
  let previewInst: ComponentInstance | null = null;
  if (isPlacementPreviewVisible) {
    const t = getComponentType(activeTypeId);
    previewInst = {
      id: "__preview__",
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
    for (const inst of state.components) {
      const t = getComponentType(inst.typeId);
      for (const port of t.portWorldPositions(inst)) {
        view.drawDebugPortDot(port.pos, port.name);
      }
    }

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
    view.hidePreview();
  }
}
