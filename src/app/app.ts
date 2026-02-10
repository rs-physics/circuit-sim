import { Grid, type Point } from "../editor/grid";
import { clientPointToSvgPoint } from "../editor/snapping";
import type { ComponentInstance, RotationDeg } from "../editor/types";
import { EditorState } from "../editor/state";
import { getComponentType, listComponentTypes } from "../editor/registry";
import { SchematicSvg } from "../render/schematicSvg";
import { hitTest } from "../editor/hitTest";

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

    const btnWire = document.createElement("button");
    btnWire.style.padding = "6px 10px";
    btnWire.textContent = "Wire: OFF";
    toolbar.appendChild(btnWire);

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
    let isWireMode = false;
    let wireStart: Point | null = null;
    let wirePreviewEnd: Point | null = null;
    let rerouteOwnerId: string | null = null;
    let rerouteAttachments: DragWireAttachment[] = [];

    let moveDrag:
      | {
          id: string;
          offset: Point;
        }
      | null = null;


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

    const deleteSelection = () => {
      const sel = state.selection;
      if (!sel) return;

      switch (sel.kind) {
        case "component":
          state.components = state.components.filter(c => c.id !== sel.id);
          clearSelection();
          renderAll();
          break;

        case "wire":
          state.wires = state.wires.filter(w => w.id !== sel.id);
          clearSelection();
          renderAll();
          break;
      }
    };


    const rotateSelection = () => {
      const sel = state.selection;
      if (!sel) return;

      if (sel.kind === "component") {
        const inst = state.components.find(c => c.id === sel.id);
        if (!inst) {
          clearSelection();
          renderAll();
          return;
        }

        inst.rotation = (((inst.rotation + 90) % 360) as RotationDeg);
        renderAll();
      }

      // Future: if sel.kind === "wire" { ... }
    };

    type DragWireAttachment = {
      fixed: Point;                 // the non-moving end (e.g. 0,6)
      incomingAxis: "h" | "v";      // orientation of the original segment
      portOffset: Point;            // port offset relative to component pos
    };

    let drag:
      | {
          kind: "component";
          id: string;
          offset: Point;
          attachments: DragWireAttachment[];
        }
      | null = null;

    let dragWirePreview: { a: Point; b: Point }[] = [];

    const rebuildReroutePreview = (
      inst: ComponentInstance,
      attachments: DragWireAttachment[]
    ) => {
      dragWirePreview = [];

      for (const a of attachments) {
        const portPos = {
          x: inst.pos.x + a.portOffset.x,
          y: inst.pos.y + a.portOffset.y,
        };

        dragWirePreview.push(
          ...manhattanFromFixed(a.fixed, portPos, a.incomingAxis)
        );
      }
    };


    const beginRerouteForSelectedComponent = (id: string) => {
      const inst = state.components.find((c) => c.id === id);
      if (!inst) return;

      const attachments: DragWireAttachment[] = [];
      rerouteAttachments = attachments;
      const type = getComponentType(inst.typeId);
      const ports = type.portWorldPositions(inst);

      for (const port of ports) {
        for (let i = state.wires.length - 1; i >= 0; i--) {
          const w = state.wires[i];

          const isA = w.a.x === port.pos.x && w.a.y === port.pos.y;
          const isB = w.b.x === port.pos.x && w.b.y === port.pos.y;
          if (!isA && !isB) continue;

          const fixed = isA ? w.b : w.a;
          const incomingAxis = w.a.y === w.b.y ? "h" : "v";

          attachments.push({
            fixed,
            incomingAxis,
            portOffset: {
              x: port.pos.x - inst.pos.x,
              y: port.pos.y - inst.pos.y,
            },
          });

          // delete the original attached segment (ONLY ONCE PER SELECTION)
          state.wires.splice(i, 1);
        }
      }

      // Store attachments on the drag state (even if not dragging yet)
      // so updateDrag can use them.
      drag = {
        kind: "component",
        id,
        offset: { x: 0, y: 0 }, // will be filled by startDrag()
        attachments,
      };

      rerouteOwnerId = id;

      rebuildReroutePreview(inst, attachments);
      renderAll();
    };

    const startDrag = (id: string, pointerWorld: Point) => {
      const inst = state.components.find((c) => c.id === id);
      if (!inst) return;

      // Ensure reroute session exists (preview ownership), but don't rely on `drag`
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



    const updateDrag = (pointerWorld: Point) => {
      const d = moveDrag;
      if (!d) return;

      const inst = state.components.find((c) => c.id === d.id);
      if (!inst) return;

      const target = {
        x: pointerWorld.x + d.offset.x,
        y: pointerWorld.y + d.offset.y,
      };

      const snapped = grid.snap(target);
      if (!view.isInsideCanvas(snapped)) return;

      inst.pos = snapped;

      // only rebuild preview if this component owns the reroute session
      if (rerouteOwnerId === d.id) {
        rebuildReroutePreview(inst, rerouteAttachments);
      }

      renderAll();
    };



    const clearSelection = () => {
      // Commit any live reroute preview
      commitReroutePreview();

      // End reroute session
      rerouteOwnerId = null;
      rerouteAttachments = [];
      dragWirePreview = [];

      // End any movement drag (defensive)
      moveDrag = null;

      // Clear selection
      state.selection = null;
    };


    const endDrag = () => {
      drag = null;
    };

    const commitReroutePreview = () => {
      if (dragWirePreview.length === 0) return;

      for (const s of dragWirePreview) {
        if (s.a.x === s.b.x && s.a.y === s.b.y) continue;

        state.wires.push({
          id: crypto.randomUUID(),
          a: s.a,
          b: s.b,
        });
      }

      dragWirePreview = [];
    };


    const manhattanSegments = (a: Point, b: Point): { a: Point; b: Point }[] => {
      // Deterministic elbow: horizontal then vertical
      if (a.x === b.x || a.y === b.y) return [{ a, b }];

      const mid: Point = { x: b.x, y: a.y };
      return [
        { a, b: mid },
        { a: mid, b },
      ];
    };

    const manhattanFromFixed = (
      fixed: Point,
      target: Point,
      incomingAxis: "h" | "v"
    ): { a: Point; b: Point }[] => {
      // aligned already
      if (fixed.x === target.x || fixed.y === target.y) {
        return [{ a: fixed, b: target }];
      }

      let mid: Point;

      if (incomingAxis === "h") {
        // original was horizontal → go vertical first
        mid = { x: fixed.x, y: target.y };
      } else {
        // original was vertical → go horizontal first
        mid = { x: target.x, y: fixed.y };
      }

      return [
        { a: fixed, b: mid },
        { a: mid, b: target },
      ];
    };


    const rerouteWireAfterMovingOneEnd = (
      wireId: string,
      movedEnd: "a" | "b",
      movedTo: Point
    ) => {
      const idx = state.wires.findIndex((w) => w.id === wireId);
      if (idx < 0) return;

      const w = state.wires[idx];

      const fixed = movedEnd === "a" ? w.b : w.a;
      const originalWasHorizontal = w.a.y === w.b.y;
      const originalWasVertical = w.a.x === w.b.x;

      const moved = movedTo;

      // If aligned, keep as a single segment (just update endpoint)
      if (fixed.x === moved.x || fixed.y === moved.y) {
        const newWire = {
          id: w.id,
          a: fixed,
          b: moved,
        };
        state.wires[idx] = newWire;
        return;
      }

      // Otherwise create a 2-segment Manhattan elbow.
      // Choose elbow based on original orientation so it "stretches naturally".
      let mid: Point;
      if (originalWasHorizontal) {
        // go horizontal from fixed, then vertical into moved
        mid = { x: moved.x, y: fixed.y };
      } else if (originalWasVertical) {
        // go vertical from fixed, then horizontal into moved
        mid = { x: fixed.x, y: moved.y };
      } else {
        // shouldn't happen in V1; fall back to horizontal then vertical
        mid = { x: moved.x, y: fixed.y };
      }

      // Replace the original wire with two wires:
      // Keep the first segment using the original id, add a second new segment.
      state.wires.splice(
        idx,
        1,
        { id: w.id, a: fixed, b: mid },
        { id: newId(), a: mid, b: moved }
      );
    };


    const isComponentPortPoint = (p: Point): boolean => {
      for (const inst of state.components) {
        const t = getComponentType(inst.typeId);
        for (const port of t.portWorldPositions(inst)) {
          if (port.pos.x === p.x && port.pos.y === p.y) return true;
        }
      }
      return false;
    };

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

        // (shouldn't happen in V1, but just ignore if diagonal)
      }
      return false;
    };

    const getAttachedWireEndpoints = (componentId: string) => {
      const inst = state.components.find((c) => c.id === componentId);
      if (!inst) return [];

      const t = getComponentType(inst.typeId);
      const portPoints = t.portWorldPositions(inst).map((p) => p.pos);

      const attached: { wireId: string; end: "a" | "b" }[] = [];

      const isPortPoint = (p: Point) =>
        portPoints.some((q) => q.x === p.x && q.y === p.y);

      for (const w of state.wires) {
        if (isPortPoint(w.a)) attached.push({ wireId: w.id, end: "a" });
        if (isPortPoint(w.b)) attached.push({ wireId: w.id, end: "b" });
      }

      return attached;
    };



    const setPlaceMode = (enabled: boolean) => {
      isPlaceMode = enabled;

      if (enabled) {
        // Turn off wire mode when entering place mode
        isWireMode = false;
        btnWire.textContent = "Wire: OFF";

        wireStart = null;
        wirePreviewEnd = null;

        // Clear selection (you already wanted this)
        clearSelection();

        // Cursor back to normal
        view.svg.style.cursor = "default";
      }

      updatePlaceButtonText();
      renderAll();
    };


    const setWireMode = (enabled: boolean) => {
      isWireMode = enabled;

      if (enabled) {
        isPlaceMode = false;
        clearSelection();
        wireStart = null;
        wirePreviewEnd = null;
        view.svg.style.cursor = "crosshair";
        updatePlaceButtonText();
        btnWire.textContent = "Wire: ON";
      } else {
        wireStart = null;
        wirePreviewEnd = null;
        view.svg.style.cursor = "default";
        btnWire.textContent = "Wire: OFF";
      }

      renderAll();
    };


      btnWire.addEventListener("click", () => setWireMode(!isWireMode));


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

    for (const w of state.wires) {
      view.drawWireSegment(w, {
        selected: state.selection?.kind === "wire" && state.selection.id === w.id,
      });
    }


      // Preview wire (if in wire mode and we have a start point)
      if (isWireMode && wireStart && wirePreviewEnd) {
        const segs = manhattanSegments(wireStart, wirePreviewEnd);
        for (const s of segs) {
          view.drawWireSegment(s, { preview: true });
        }
      }

      for (const inst of state.components) {
        const t = getComponentType(inst.typeId);
        t.render(view, inst, {
          selected: state.selection?.kind === "component" && state.selection.id === inst.id,
        });
      }

      for (const s of dragWirePreview) {
        view.drawWireSegment(s, { preview: true });
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

      const inside = view.isInsideCanvas(svgPoint);
      isMouseOverCanvas = inside;

      if (!inside) {
        if (isPlaceMode || isWireMode) renderAll();
        return;
      }

      const snapped = grid.snap(svgPoint);

      if (isPlaceMode) {
        previewPos = snapped;
        renderAll();
        return;
      }

      if (isWireMode) {
        wirePreviewEnd = snapped;
        renderAll();
        return;
      }
    });



    view.svg.addEventListener("mouseleave", () => {
      isMouseOverCanvas = false;
      wirePreviewEnd = null;
      renderAll();
    });

    // Right-click cancels placement (back to "select"/idle)
    view.svg.addEventListener("contextmenu", (e: MouseEvent) => {
      e.preventDefault();

      // Place mode: unchanged
      if (isPlaceMode) {
        setPlaceMode(false);
        return;
      }

      // Wire mode
      if (isWireMode) {
        if (wireStart) {
          // First right-click: end current wire chain
          wireStart = null;
          wirePreviewEnd = null;
          renderAll();
          return;
        }

        // Second right-click: exit wire mode
        setWireMode(false);
        return;
      }
    });




    // Place on pointerdown
    view.svg.addEventListener("pointerdown", (e: PointerEvent) => {
      if (e.button !== 0) return; // left only

      const svgPoint = clientPointToSvgPoint(view.svg, {
        x: e.clientX,
        y: e.clientY,
      });

      // --- WIRE MODE ---
      if (isWireMode) {
        if (!view.isInsideCanvas(svgPoint)) return;

        const p = grid.snap(svgPoint);
        const onPort = isComponentPortPoint(p);
        const onWire = isPointOnWire(p);



        // first click sets start
        if (!wireStart) {
          wireStart = p;
          wirePreviewEnd = p;
          renderAll();
          e.preventDefault();
          return;
        }

        // second click commits segments
        const segs = manhattanSegments(wireStart, p);

        for (const s of segs) {
          // ignore zero-length segments
          if (s.a.x === s.b.x && s.a.y === s.b.y) continue;

          state.wires.push({
            id: newId(),
            a: s.a,
            b: s.b,
          });
        }

        // If we ended on a component port, finish the current wire chain.
        // Otherwise keep chaining from the end point.
        if (onPort || onWire) {
          wireStart = null;
          wirePreviewEnd = null;
        } else {
          wireStart = p;
          wirePreviewEnd = p;
        }

        renderAll();
        e.preventDefault();
        return;
      }

    // --- SELECTION + DRAG MODE ---
    if (!isPlaceMode) {
      if (view.isInsideCanvas(svgPoint)) {
        const hit = hitTest(state, svgPoint);

        // Commit old reroute only if clicking away from the current reroute owner
        if (
          rerouteOwnerId &&
          (!hit || hit.kind !== "component" || hit.id !== rerouteOwnerId)
        ) {
          commitReroutePreview();
          rerouteOwnerId = null;
          drag = null;
        }

        // Update selection
        state.selection = hit;

        // If clicked a component: ALWAYS start drag (even if already selected)
        if (hit?.kind === "component") {
          if (rerouteOwnerId !== hit.id) {
            beginRerouteForSelectedComponent(hit.id);
          }

          startDrag(hit.id, svgPoint);
          view.svg.setPointerCapture(e.pointerId);

          renderAll();
          e.preventDefault();
          return;
        }

        renderAll();
        e.preventDefault();
        return;
      } else {
        // Clicked outside canvas
        // (Optional) commit + clear selection, depending on your rules:
        // commitReroutePreview();
        // rerouteOwnerId = null;
        // drag = null;
        state.selection = null;

        renderAll();
        e.preventDefault();
        return;
      }
    }



      // --- PLACEMENT MODE ---
      if (!isMouseOverCanvas) return;

      const t = getComponentType(activeTypeId);

      const inst: ComponentInstance = {
        id: newId(),
        typeId: activeTypeId,
        pos: previewPos,
        rotation: previewRotation,
        params: t.defaultParams(),
      };

      state.components.push(inst);

      // Optional: select the newly placed component (feels nice)
      clearSelection();

      renderAll();
      e.preventDefault();
    });

    view.svg.addEventListener("pointermove", (e: PointerEvent) => {
      if (isPlaceMode) return;
      if (!drag) return;

      const svgPoint = clientPointToSvgPoint(view.svg, {
        x: e.clientX,
        y: e.clientY,
      });

      updateDrag(svgPoint);
      e.preventDefault();
    });

    view.svg.addEventListener("pointerup", (e: PointerEvent) => {
      if (!moveDrag) return;

      moveDrag = null;

      try {
        view.svg.releasePointerCapture(e.pointerId);
      } catch {}

      renderAll();
      e.preventDefault();
    });


    // Keys: D toggle debug, R rotate preview
    window.addEventListener("keydown", (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();

      if (k === "escape") {
        if (isWireMode) {
          wireStart = null;
          wirePreviewEnd = null;
          setWireMode(false);
          return;
        }
      }

      if (k === "w") {
        setWireMode(!isWireMode);
        return;
      }


      if (k === "delete" || k === "backspace") {
        if (isPlaceMode) return;
        deleteSelection();
        e.preventDefault();
        return;
      }

      if (k === "d") {
        showDebug = !showDebug;
        renderAll();
        return;
      }

      if (k === "r") {
        if (isPlaceMode) {
          previewRotation = ((previewRotation + 90) % 360) as RotationDeg;
          renderAll();
        } else {
          rotateSelection();
        }
        return;
      }
    
    });

    // Start
    updatePlaceButtonText();
    renderAll();
    console.log("Component system: generic placement + debug ports.");
  }
}
