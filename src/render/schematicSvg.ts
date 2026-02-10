import type { Point } from "../editor/grid";
import type { SymbolSpec } from "../editor/componentType";

type ViewBox = { x: number; y: number; width: number; height: number };
type WorldRect = { x: number; y: number; width: number; height: number };

function svgEl<K extends keyof SVGElementTagNameMap>(
  tag: K,
  attrs: Record<string, string> = {}
): SVGElementTagNameMap[K] {
  const el = document.createElementNS("http://www.w3.org/2000/svg", tag);
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
  return el;
}

export class SchematicSvg {
  readonly svg: SVGSVGElement;

  // layers
  private readonly gridG: SVGGElement;
  private readonly wiresG: SVGGElement;
  private readonly mainG: SVGGElement;
  private readonly debugG: SVGGElement;
  private readonly previewG: SVGGElement;

  // world/camera
  private readonly world: WorldRect = { x: 0, y: 0, width: 1200, height: 800 };
  private viewBox: ViewBox = { x: 0, y: 0, width: 1200, height: 800 };

  constructor(host: HTMLElement) {
    this.svg = svgEl("svg", {
      width: "100%",
      height: "100%",
      viewBox: `${this.viewBox.x} ${this.viewBox.y} ${this.viewBox.width} ${this.viewBox.height}`,
    });

    this.svg.style.display = "block";
    this.svg.style.userSelect = "none";
    this.svg.style.touchAction = "none";

    // Layers (bottom -> top)
    this.gridG = svgEl("g");
    this.wiresG = svgEl("g");
    this.mainG = svgEl("g");
    this.debugG = svgEl("g");
    this.previewG = svgEl("g");

    this.svg.appendChild(this.gridG);
    this.svg.appendChild(this.wiresG);
    this.svg.appendChild(this.mainG);
    this.svg.appendChild(this.debugG);
    this.svg.appendChild(this.previewG);

    host.innerHTML = "";
    host.appendChild(this.svg);
  }

  // --- camera ---
  setViewBox(vb: ViewBox) {
    this.viewBox = vb;
    this.svg.setAttribute("viewBox", `${vb.x} ${vb.y} ${vb.width} ${vb.height}`);
  }

  getViewBox(): ViewBox {
    return this.viewBox;
  }

  getWorldRect(): WorldRect {
    return this.world;
  }

  // world bounds check (NOT camera bounds)
  isInsideCanvas(p: { x: number; y: number }): boolean {
    const w = this.world;
    return (
      p.x >= w.x &&
      p.x <= w.x + w.width &&
      p.y >= w.y &&
      p.y <= w.y + w.height
    );
  }

  // --- clears ---
  clear() {
    while (this.gridG.firstChild) this.gridG.removeChild(this.gridG.firstChild);
    while (this.wiresG.firstChild) this.wiresG.removeChild(this.wiresG.firstChild);
    while (this.mainG.firstChild) this.mainG.removeChild(this.mainG.firstChild);

    // I'd rather clear these too so "clear()" truly means clear everything visual.
    this.clearDebug();
    this.clearPreview();
  }

  clearPreview() {
    while (this.previewG.firstChild) this.previewG.removeChild(this.previewG.firstChild);
  }

  clearDebug() {
    while (this.debugG.firstChild) this.debugG.removeChild(this.debugG.firstChild);
  }

  // --- debug ---
  drawDebugPortDot(p: Point, label: string) {
    const g = svgEl("g", { "pointer-events": "none" });

    g.appendChild(
      svgEl("circle", {
        cx: `${p.x}`,
        cy: `${p.y}`,
        r: "4",
        fill: "black",
      })
    );

    g.appendChild(
      svgEl("text", {
        x: `${p.x + 6}`,
        y: `${p.y - 6}`,
        "font-size": "12",
        "font-family": "system-ui, sans-serif",
        fill: "black",
      })
    ).textContent = label;

    this.debugG.appendChild(g);
  }

  // --- wires ---
  drawWireSegment(
    seg: { a: Point; b: Point },
    opts: { preview?: boolean; selected?: boolean } = {}
  ) {
    const isPreview = !!opts.preview;
    const isSelected = !!opts.selected;

    this.wiresG.appendChild(
      svgEl("line", {
        x1: `${seg.a.x}`,
        y1: `${seg.a.y}`,
        x2: `${seg.b.x}`,
        y2: `${seg.b.y}`,
        stroke: isSelected ? "#1e90ff" : "black",
        "stroke-width": isPreview ? "1" : isSelected ? "3" : "2",
        "stroke-linecap": "round",
        ...(isPreview ? { "stroke-dasharray": "6 4", opacity: "0.6" } : {}),
      })
    );
  }

  // --- grid ---
  drawGrid(gridSize: number) {
    const w = this.world;
    const vb = this.viewBox;

    // background for the full world sheet
    this.gridG.appendChild(
      svgEl("rect", {
        x: `${w.x}`,
        y: `${w.y}`,
        width: `${w.width}`,
        height: `${w.height}`,
        fill: "white",
      })
    );

    // draw only the visible region (clamped to world)
    const minX = Math.max(w.x, vb.x);
    const maxX = Math.min(w.x + w.width, vb.x + vb.width);
    const minY = Math.max(w.y, vb.y);
    const maxY = Math.min(w.y + w.height, vb.y + vb.height);

    const startX = Math.floor(minX / gridSize) * gridSize;
    const endX = Math.ceil(maxX / gridSize) * gridSize;
    const startY = Math.floor(minY / gridSize) * gridSize;
    const endY = Math.ceil(maxY / gridSize) * gridSize;

    for (let x = startX; x <= endX; x += gridSize) {
      this.gridG.appendChild(
        svgEl("line", {
          x1: `${x}`,
          y1: `${minY}`,
          x2: `${x}`,
          y2: `${maxY}`,
          stroke: "#e8e8e8",
        })
      );
    }

    for (let y = startY; y <= endY; y += gridSize) {
      this.gridG.appendChild(
        svgEl("line", {
          x1: `${minX}`,
          y1: `${y}`,
          x2: `${maxX}`,
          y2: `${y}`,
          stroke: "#e8e8e8",
        })
      );
    }
  }

  // --- symbols ---
  private buildRectResistorGroup(
    center: Point,
    rotationDeg: number,
    spec: { bodyW: number; bodyH: number; lead: number },
    isPreview: boolean,
    isSelected: boolean
  ) {
    const w = spec.bodyW;
    const h = spec.bodyH;
    const lead = spec.lead;

    const g = svgEl("g", {
      transform: `translate(${center.x} ${center.y}) rotate(${rotationDeg})`,
      opacity: isPreview ? "0.45" : "1",
    });

    // selection highlight box (dashed)
    if (isSelected && !isPreview) {
      const halfW = spec.lead + spec.bodyW / 2;
      const halfH = Math.max(spec.bodyH / 2, 2);
      const pad = 10;

      g.appendChild(
        svgEl("rect", {
          x: `${-halfW - pad}`,
          y: `${-halfH - pad}`,
          width: `${(halfW + pad) * 2}`,
          height: `${(halfH + pad) * 2}`,
          fill: "none",
          stroke: "#1e90ff",
          "stroke-width": "1",
          "stroke-dasharray": "4 3",
          "pointer-events": "none",
        })
      );
    }

    // leads
    g.appendChild(
      svgEl("line", {
        x1: `${-lead - w / 2}`,
        y1: "0",
        x2: `${-w / 2}`,
        y2: "0",
        stroke: "black",
        "stroke-width": "2",
      })
    );

    g.appendChild(
      svgEl("line", {
        x1: `${w / 2}`,
        y1: "0",
        x2: `${lead + w / 2}`,
        y2: "0",
        stroke: "black",
        "stroke-width": "2",
      })
    );

    // body
    g.appendChild(
      svgEl("rect", {
        x: `${-w / 2}`,
        y: `${-h / 2}`,
        width: `${w}`,
        height: `${h}`,
        fill: "white",
        stroke: "black",
        "stroke-width": "2",
      })
    );

    // Important: don't let preview eat pointer events.
    if (isPreview) g.setAttribute("pointer-events", "none");

    return g;
  }

  drawComponentSymbol(
    inst: { id: string; pos: Point; rotation: number },
    spec: SymbolSpec,
    opts: { preview?: boolean; selected?: boolean } = {}
  ) {
    const isPreview = !!opts.preview;
    const isSelected = !!opts.selected;

    let g: SVGGElement;

    if (spec.kind === "rectResistor") {
      g = this.buildRectResistorGroup(inst.pos, inst.rotation, spec, isPreview, isSelected);
    } else {
      throw new Error(`Unsupported symbol kind: ${(spec as any).kind}`);
    }

    g.setAttribute("data-id", inst.id);

    // optional extra “pop” on selection
    if (isSelected && !isPreview) {
      g.setAttribute("filter", "drop-shadow(0 0 2px rgba(0,0,0,0.4))");
    }

    if (isPreview) {
      this.clearPreview();
      this.previewG.appendChild(g);
    } else {
      this.mainG.appendChild(g);
    }
  }

  hidePreview() {
    this.clearPreview();
  }
}