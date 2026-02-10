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

  // UI/tool state
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

  // reroute preview
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

  view.setViewBox(camera);
  view.clear();
  view.drawGrid(grid.size);
  view.clearDebug();

  // Wires
  for (const w of state.wires) {
    view.drawWireSegment(w, {
      selected: state.selection?.kind === "wire" && state.selection.id === w.id,
    });
  }

  // Wire preview
  if (isWireMode && wireStart && wirePreviewEnd) {
    const segs = manhattanSegments(wireStart, wirePreviewEnd);
    for (const s of segs) view.drawWireSegment(s, { preview: true });
  }

  // Components
  for (const inst of state.components) {
    const t = getComponentType(inst.typeId);
    t.render(view, inst, {
      selected: state.selection?.kind === "component" && state.selection.id === inst.id,
    });
  }

  // Reroute preview wires
  for (const s of dragWirePreview) {
    view.drawWireSegment(s, { preview: true });
  }

  // Debug overlay (ports)
  if (showDebug) {
    for (const inst of state.components) {
      const t = getComponentType(inst.typeId);
      for (const port of t.portWorldPositions(inst)) {
        view.drawDebugPortDot(port.pos, port.name);
      }
    }

    // Preview ports (placement)
    if (isPlaceMode && isMouseOverCanvas) {
      const t = getComponentType(activeTypeId);
      const previewInst: ComponentInstance = {
        id: "__preview__",
        typeId: activeTypeId,
        pos: previewPos,
        rotation: previewRotation,
        params: t.defaultParams(),
      };

      for (const port of t.portWorldPositions(previewInst)) {
        view.drawDebugPortDot(port.pos, port.name);
      }
    }
  }

  // Preview symbol (placement)
  if (isPlaceMode && isMouseOverCanvas) {
    const t = getComponentType(activeTypeId);
    const previewInst: ComponentInstance = {
      id: "__preview__",
      typeId: activeTypeId,
      pos: previewPos,
      rotation: previewRotation,
      params: t.defaultParams(),
    };
    t.render(view, previewInst, { preview: true });
  } else {
    view.hidePreview();
  }
}
