import type { Point } from "../editor/grid";
import type { SymbolSpec } from "../editor/componentType";

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
    private readonly mainG: SVGGElement;
    private readonly wiresG: SVGGElement;
    private readonly previewG: SVGGElement;
    private readonly debugG: SVGGElement;


    constructor(host: HTMLElement) {
        const vb = this.getViewBox();
        this.svg = svgEl("svg", {
        width: "100%",
        height: "100%",
        viewBox: `${vb.x} ${vb.y} ${vb.width} ${vb.height}`,
    });

    this.svg.style.display = "block";
    this.svg.style.userSelect = "none";
    this.svg.style.touchAction = "none";

    // Main content (grid + placed components)
    this.mainG = svgEl("g");

    // Wires
    this.wiresG = svgEl("g");

    // Debug layer
    this.debugG = svgEl("g");

    // Preview layer (hover ghost)
    this.previewG = svgEl("g");

    this.svg.appendChild(this.mainG);
    this.svg.appendChild(this.wiresG);  // wires
    this.svg.appendChild(this.debugG);   // debug above main
    this.svg.appendChild(this.previewG); // preview on top

    host.innerHTML = "";
    host.appendChild(this.svg);
    }


    clear() {
        while (this.mainG.firstChild) this.mainG.removeChild(this.mainG.firstChild);
        while (this.wiresG.firstChild) this.wiresG.removeChild(this.wiresG.firstChild);
    this.clearPreview();
    }

    clearPreview() {
      while (this.previewG.firstChild) {
          this.previewG.removeChild(this.previewG.firstChild);
      }
    }

    clearDebug() {
      while (this.debugG.firstChild) {
        this.debugG.removeChild(this.debugG.firstChild);
      }
    }

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
          "stroke-width": isPreview ? "1" : (isSelected ? "3" : "2"),
          "stroke-linecap": "round",
          ...(isPreview ? { "stroke-dasharray": "6 4", opacity: "0.6" } : {}),
        })
      );
    }

    getViewBox() {
        // Single source of truth for the drawable canvas area
        return { x: 0, y: 0, width: 1200, height: 800 };
    }

    isInsideCanvas(p: { x: number; y: number }): boolean {
        const vb = this.getViewBox();
        return (
            p.x >= vb.x &&
            p.x <= vb.x + vb.width &&
            p.y >= vb.y &&
            p.y <= vb.y + vb.height
        );
    }



  drawGrid(gridSize: number) {
    this.mainG.appendChild(
      svgEl("rect", {
        x: "0",
        y: "0",
        width: "1200",
        height: "800",
        fill: "white",
      })
    );

    for (let x = 0; x <= 1200; x += gridSize) {
      this.mainG.appendChild(
        svgEl("line", {
          x1: `${x}`,
          y1: "0",
          x2: `${x}`,
          y2: "800",
          stroke: "#e8e8e8",
        })
      );
    }

    for (let y = 0; y <= 800; y += gridSize) {
      this.mainG.appendChild(
        svgEl("line", {
          x1: "0",
          y1: `${y}`,
          x2: "1200",
          y2: `${y}`,
          stroke: "#e8e8e8",
        })
      );
    }
  }

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

  if (isSelected && !isPreview) {
    const halfW = spec.lead + spec.bodyW / 2;
    const halfH = Math.max(spec.bodyH / 2, 2);

    const pad = 10; // in world units; tweak to taste

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

  if (isPreview) {
    g.setAttribute("pointer-events", "none");
  }

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

  // Attach identity for selection later
  g.setAttribute("data-id", inst.id);

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
