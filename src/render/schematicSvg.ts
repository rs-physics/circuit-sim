import type { Point } from "../editor/grid";
import type { SymbolSpec } from "../editor/componentType";

/**
 * ViewBox: the visible camera window in SVG world units.
 * WorldRect: the fixed "paper" area you're allowed to draw in.
 */
type ViewBox = { x: number; y: number; width: number; height: number };
type WorldRect = { x: number; y: number; width: number; height: number };

/**
 * Small helper to create SVG elements with attributes.
 * Keeps DOM creation noise out of the drawing logic.
 */
function svgEl<K extends keyof SVGElementTagNameMap>(
  tag: K,
  attrs: Record<string, string> = {}
): SVGElementTagNameMap[K] {
  const el = document.createElementNS("http://www.w3.org/2000/svg", tag);
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
  return el;
}

/**
 * SchematicSvg
 *
 * Responsible for ALL SVG drawing operations:
 * - grid
 * - wires
 * - symbols
 * - selection highlights
 * - debug overlays
 * - preview rendering
 *
 * The editor/app code only calls high-level methods like:
 *   drawGrid(), drawWireSegment(), drawComponentSymbol(), etc.
 */
export class SchematicSvg {
  readonly svg: SVGSVGElement;

  // --- Layer groups (bottom -> top) ---
  private readonly gridG: SVGGElement;
  private readonly wiresG: SVGGElement;
  private readonly mainG: SVGGElement;
  private readonly debugG: SVGGElement;
  private readonly previewG: SVGGElement;

  // --- World + camera ---
  // "World" is fixed canvas bounds, independent of camera viewBox.
  private readonly world: WorldRect = { x: 0, y: 0, width: 1200, height: 800 };

  // "ViewBox" is the current visible camera rectangle.
  private viewBox: ViewBox = { x: 0, y: 0, width: 1200, height: 800 };

  constructor(host: HTMLElement) {
    // Create the root <svg> element.
    this.svg = svgEl("svg", {
      width: "100%",
      height: "100%",
      viewBox: `${this.viewBox.x} ${this.viewBox.y} ${this.viewBox.width} ${this.viewBox.height}`,
    });

    // UI/interaction defaults
    this.svg.style.display = "block";
    this.svg.style.userSelect = "none";
    this.svg.style.touchAction = "none";

    // Create layers. Order matters.
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

    // Replace host contents and mount SVG.
    host.innerHTML = "";
    host.appendChild(this.svg);
  }

  // ===========================================================================
  // Camera + world helpers
  // ===========================================================================

  /** Update camera window (viewBox). */
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

  /**
   * True if a point is within the fixed world bounds.
   * This is NOT the same as being visible inside the camera viewBox.
   */
  isInsideCanvas(p: Point): boolean {
    const w = this.world;
    return (
      p.x >= w.x &&
      p.x <= w.x + w.width &&
      p.y >= w.y &&
      p.y <= w.y + w.height
    );
  }

  // ===========================================================================
  // Clearing
  // ===========================================================================

  /**
   * Clear main drawing layers.
   * Note: we also clear debug + preview for "true visual reset".
   */
  clear() {
    while (this.gridG.firstChild) this.gridG.removeChild(this.gridG.firstChild);
    while (this.wiresG.firstChild) this.wiresG.removeChild(this.wiresG.firstChild);
    while (this.mainG.firstChild) this.mainG.removeChild(this.mainG.firstChild);

    this.clearDebug();
    this.clearPreview();
  }

  clearPreview() {
    while (this.previewG.firstChild) this.previewG.removeChild(this.previewG.firstChild);
  }

  clearDebug() {
    while (this.debugG.firstChild) this.debugG.removeChild(this.debugG.firstChild);
  }

  hidePreview() {
    this.clearPreview();
  }

  // ===========================================================================
  // Debug overlay
  // ===========================================================================

  /**
   * Draw a small dot + label at a port location.
   * Used for "showDebug" mode.
   */
  drawDebugPortDot(p: Point, label: string) {
    // pointer-events none so debug overlay never interferes with clicking/dragging.
    const g = svgEl("g", { "pointer-events": "none" });

    g.appendChild(
      svgEl("circle", {
        cx: `${p.x}`,
        cy: `${p.y}`,
        r: "4",
        fill: "black",
      })
    );

    const text = svgEl("text", {
      x: `${p.x + 6}`,
      y: `${p.y - 6}`,
      "font-size": "12",
      "font-family": "system-ui, sans-serif",
      fill: "black",
    });
    text.textContent = label;
    g.appendChild(text);

    this.debugG.appendChild(g);
  }

  // ===========================================================================
  // Wires
  // ===========================================================================

  /**
   * Draw a wire segment (axis-aligned line).
   * - preview: dashed + semi-transparent
   * - selected: thicker + highlighted colour
   */
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

  // ===========================================================================
  // Grid
  // ===========================================================================

  /**
   * Draw the background "paper" + grid lines.
   * Optimization: only draw grid lines within the currently visible viewBox,
   * clamped to the world bounds.
   */
  drawGrid(gridSize: number) {
    const world = this.world;
    const vb = this.viewBox;

    // Draw a white background for the full world "sheet".
    this.gridG.appendChild(
      svgEl("rect", {
        x: `${world.x}`,
        y: `${world.y}`,
        width: `${world.width}`,
        height: `${world.height}`,
        fill: "white",
      })
    );

    // Visible region = camera viewBox clamped to the world rectangle.
    const minX = Math.max(world.x, vb.x);
    const maxX = Math.min(world.x + world.width, vb.x + vb.width);
    const minY = Math.max(world.y, vb.y);
    const maxY = Math.min(world.y + world.height, vb.y + vb.height);

    // Expand to full grid lines so we don't get "partial" stepping.
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

  // ===========================================================================
  // Symbols (public draw API)
  // ===========================================================================

  /**
   * Draw a component symbol.
   *
   * - preview symbols go into previewG (clears previous preview)
   * - real symbols go into mainG
   */
  drawComponentSymbol(
    inst: { id: string; pos: Point; rotation: number },
    spec: SymbolSpec,
    opts: { preview?: boolean; selected?: boolean } = {}
  ) {
    const isPreview = !!opts.preview;
    const isSelected = !!opts.selected;

    let g: SVGGElement;

    switch (spec.kind) {
      case "rectResistor":
        g = this.buildRectResistorGroup(inst.pos, inst.rotation, spec, isPreview, isSelected);
        break;

      default:
        // This makes it obvious when you add new SymbolSpec kinds but forget to render them.
        throw new Error(`Unsupported symbol kind: ${(spec as any).kind}`);
    }

    // Useful for debugging / future click detection via DOM if you ever want that route.
    g.setAttribute("data-id", inst.id);

    // Optional “pop” on selection (CSS drop-shadow via filter attr)
    if (isSelected && !isPreview) {
      g.setAttribute("filter", "drop-shadow(0 0 2px rgba(0,0,0,0.4))");
    }

    if (isPreview) {
      // Preview is always “the one currently hovering”.
      this.clearPreview();
      this.previewG.appendChild(g);
    } else {
      this.mainG.appendChild(g);
    }
  }

  // ===========================================================================
  // Symbol builders (private helpers)
  // ===========================================================================

  /**
   * Build a resistor group centered at (center), rotated about its center.
   * The group includes:
   * - optional selection highlight box
   * - leads
   * - resistor body
   */
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

    // Transform the group so all child geometry can be drawn around (0,0).
    const g = svgEl("g", {
      transform: `translate(${center.x} ${center.y}) rotate(${rotationDeg})`,
      opacity: isPreview ? "0.45" : "1",
    });

    // Selection highlight box (dashed)
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

    // Leads
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

    // Body
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

    // IMPORTANT:
    // Preview should never block pointer events (otherwise selection becomes annoying).
    if (isPreview) g.setAttribute("pointer-events", "none");

    return g;
  }
}