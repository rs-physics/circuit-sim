import type { Point } from "../editor/grid";
import type { SymbolSpec } from "../editor/componentType";
import { svgEl } from "./svgEl";
import { buildSymbolGroup } from "./drawComponentSymbol";

/**
 * ViewBox: the visible camera window in SVG world units.
 * WorldRect: the fixed "paper" area you're allowed to draw in.
 */
type ViewBox = { x: number; y: number; width: number; height: number };
type WorldRect = { x: number; y: number; width: number; height: number };

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
  private readonly world: WorldRect = { x: 0, y: 0, width: 1920, height: 1080 };

  // "ViewBox" is the current visible camera rectangle.
  private viewBox: ViewBox = { x: 0, y: 0, width: 1200, height: 800 };

  constructor(host: HTMLElement) {
    // Create the root <svg> element.
    this.svg = svgEl("svg", {
      width: "1200",
      height: "800",
      viewBox: `${this.viewBox.x} ${this.viewBox.y} ${this.viewBox.width} ${this.viewBox.height}`,
    });

    // UI/interaction defaults
    this.svg.style.display = "block";
    this.svg.style.userSelect = "none";
    this.svg.style.touchAction = "none";

    // Create layers. Order matters.
    this.gridG = svgEl("g");
    this.gridG.setAttribute("shape-rendering", "crispEdges");
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

    // verticals
    for (let x = startX; x <= endX; x += gridSize) {
      this.gridG.appendChild(
        svgEl("line", {
          x1: `${x}`,
          y1: `${startY}`,
          x2: `${x}`,
          y2: `${endY}`,
          stroke: "#e8e8e8",
          "stroke-width": "1",
          "vector-effect": "non-scaling-stroke",
          "shape-rendering": "crispEdges",
        })
      );
    }

    // horizontals
    for (let y = startY; y <= endY; y += gridSize) {
      this.gridG.appendChild(
        svgEl("line", {
          x1: `${startX}`,
          y1: `${y}`,
          x2: `${endX}`,
          y2: `${y}`,
          stroke: "#e8e8e8",
          "stroke-width": "1",
          "vector-effect": "non-scaling-stroke",
          "shape-rendering": "crispEdges",
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

    const g = buildSymbolGroup(inst.pos, inst.rotation, spec, {
      preview: isPreview,
      selected: isSelected,
    });

    g.setAttribute("data-id", inst.id);

    //This section had a selection filter which applied a drop shadow
    //when selecting a component.  Commented out because im not too keen on it
    /*
      if (isSelected && !isPreview) {
        g.setAttribute("filter", "drop-shadow(0 0 2px rgba(0,0,0,0.4))");
      }
    */

    if (isPreview) {
      this.clearPreview();
      this.previewG.appendChild(g);
    } else {
      this.mainG.appendChild(g);
    }
  }

}