import { Grid, type Point } from "../editor/grid";
import { clientPointToSvgPoint } from "../editor/snapping";
import type { ComponentInstance, RotationDeg } from "../editor/types";
import { EditorState } from "../editor/state";
import { getComponentType, listComponentTypes } from "../editor/registry";
import { SchematicSvg } from "../render/schematicSvg";

function newId(): string {
  return crypto.randomUUID();
}

export class App {
  start() {
    const host = document.querySelector<HTMLDivElement>("#app");
    if (!host) throw new Error("Missing #app element");

    host.innerHTML = "";
    host.style.width = "100%";
    host.style.height = "100vh";

    // --- TEMP TOOLBAR ---
    const toolbar = document.createElement("div");
    toolbar.style.display = "flex";
    toolbar.style.gap = "8px";
    toolbar.style.padding = "8px";
    toolbar.style.borderBottom = "1px solid #ddd";
    toolbar.style.fontFamily = "system-ui, sans-serif";

    const btnPlaceComponent = document.createElement("button");
    btnPlaceComponent.style.padding = "6px 10px";
    toolbar.appendChild(btnPlaceComponent);

    const selComponentType = document.createElement("select");
    selComponentType.style.padding = "6px 10px";
    toolbar.appendChild(selComponentType);

    const canvasHost = document.createElement("div");
    canvasHost.style.height = "calc(100vh - 42px)";
    canvasHost.style.width = "100%";

    host.appendChild(toolbar);
    host.appendChild(canvasHost);

    // --- STATE ---
    const state = new EditorState();

    // --- CANVAS ---
    const grid = new Grid(25);
    const view = new SchematicSvg(canvasHost);

    // --- TOOL STATE ---
    let isPlaceMode = false;
    let previewRotation: RotationDeg = 0;
    let previewPos: Point = { x: 0, y: 0 };
    let isMouseOverCanvas = false;
    let showDebug = true;

    // --- COMPONENT TYPE SELECTION ---
    const availableTypes = listComponentTypes();
    if (availableTypes.length === 0) throw new Error("No component types registered.");

    let activeTypeId = availableTypes[0].typeId;

    // populate dropdown
    for (const t of availableTypes) {
      const opt = document.createElement("option");
      opt.value = t.typeId;
      opt.textContent = t.displayName;
      selComponentType.appendChild(opt);
    }
    selComponentType.value = activeTypeId;

    const updatePlaceButtonText = () => {
      if (!isPlaceMode) {
        btnPlaceComponent.textContent = "Place Component: OFF";
      } else {
        const t = getComponentType(activeTypeId);
        btnPlaceComponent.textContent = `Place Component: ON (${t.displayName})`;
      }
    };

    const setPlaceMode = (enabled: boolean) => {
      isPlaceMode = enabled;
      updatePlaceButtonText();
      renderAll();
    };

    selComponentType.addEventListener("change", () => {
      activeTypeId = selComponentType.value;
      updatePlaceButtonText();
      renderAll();
    });

    btnPlaceComponent.addEventListener("click", () => {
      setPlaceMode(!isPlaceMode);
    });

    const renderAll = () => {
      view.clear();
      view.drawGrid(grid.size);
      view.clearDebug();

      for (const inst of state.components) {
        const t = getComponentType(inst.typeId);
        t.render(view, inst, { selected: inst.id === state.selectedId });
      }

      // DEBUG overlay (ports)
      if (showDebug) {
        for (const inst of state.components) {
          const t = getComponentType(inst.typeId);
          for (const port of t.portWorldPositions(inst)) {
            view.drawDebugPortDot(port.pos, port.name);
          }
        }

        // Preview ports too (optional)
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

      // Preview symbol (on top)
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
    };

    // Mouse move updates preview position
    view.svg.addEventListener("mousemove", (e: MouseEvent) => {
      const svgPoint = clientPointToSvgPoint(view.svg, {
        x: e.clientX,
        y: e.clientY,
      });

      if (!view.isInsideCanvas(svgPoint)) {
        isMouseOverCanvas = false;
        renderAll();
        return;
      }

      isMouseOverCanvas = true;
      previewPos = grid.snap(svgPoint);
      renderAll();
    });

    view.svg.addEventListener("mouseleave", () => {
      isMouseOverCanvas = false;
      renderAll();
    });

    // Right-click cancels placement (back to "select"/idle)
    view.svg.addEventListener("contextmenu", (e: MouseEvent) => {
      e.preventDefault();
      if (isPlaceMode) setPlaceMode(false);
    });

    // Place on pointerdown
    view.svg.addEventListener("pointerdown", (e: PointerEvent) => {
      if (e.button !== 0) return; // left only

      const g = (e.target as Element | null)?.closest("g[data-id]");
      if (g) {
        console.log("Clicked SVG element with id:", g.getAttribute("data-id"));
      }

      if (!isPlaceMode || !isMouseOverCanvas) return;

      const t = getComponentType(activeTypeId);

      const inst: ComponentInstance = {
        id: newId(),
        typeId: activeTypeId,
        pos: previewPos,
        rotation: previewRotation,
        params: t.defaultParams(),
      };

      state.components.push(inst);

      console.log("Placed component:", inst);
      console.log("  Ports:", t.portWorldPositions(inst));

      renderAll();
      e.preventDefault();
    });

    // Keys: D toggle debug, R rotate preview
    window.addEventListener("keydown", (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();

      if (k === "d") {
        showDebug = !showDebug;
        renderAll();
        return;
      }

      if (k === "r") {
        if (!isPlaceMode) return;
        previewRotation = ((previewRotation + 90) % 360) as RotationDeg;
        renderAll();
      }
    });

    // Start
    updatePlaceButtonText();
    renderAll();
    console.log("Component system: generic placement + debug ports.");
  }
}
