import type { ComponentType, RenderOpts, SymbolSpec } from "../componentType";
import type { ComponentInstance, PortDef, BBox } from "../types";
import type { Point } from "../grid";
import { rotatePoint } from "../geom";

/**
 * Resistor component (V1)
 *
 * Notes:
 * - Geometry lives in symbolSpec() as the "single source of truth".
 * - Ports + bbox are derived from that spec so nothing drifts out of sync.
 * - Values are chosen so ports land on the grid nicely (grid=25 by default).
 */
export class ResistorType implements ComponentType {
  // Registry identifiers
  typeId = "resistor";
  displayName = "Resistor";

  /**
   * Default component parameters.
   * (Eventually you might store this as string "100Ω" etc, but numeric is fine for V1.)
   */
  defaultParams(): Record<string, number> {
    return { R: 100 };
  }

  /**
   * Single source of truth for how the resistor looks and how big it is.
   *
   * Grid alignment reasoning (example with grid=25):
   * We want each port to sit exactly on a grid point, so we choose dimensions such that:
   *   portOffset = lead + bodyW/2
   * becomes a multiple of 25.
   *
   * With lead=40 and bodyW=70:
   *   portOffset = 40 + 35 = 75 = 3 * 25 ✅
   */
  symbolSpec(): SymbolSpec {
    return {
      kind: "rectResistor",
      bodyW: 70,
      bodyH: 28,
      lead: 40,
    };
  }

  /**
   * Internal helper: fetch the resistor spec with a clear runtime check.
   * (Handy if you ever add more symbol kinds later.)
   */
  private getSpec() {
    const s = this.symbolSpec();
    if (s.kind !== "rectResistor") throw new Error("Unexpected symbol kind");
    return s;
  }

  /**
   * Port definitions are in *local* component space (before rotation/translation).
   */
  ports(): PortDef[] {
    const s = this.getSpec();
    const portOffset = s.lead + s.bodyW / 2;

    return [
      { name: "A", offset: { x: -portOffset, y: 0 } },
      { name: "B", offset: { x: +portOffset, y: 0 } },
    ];
  }

  /**
   * Bounding box in local component space (used for hit-testing and selection).
   * This bbox is axis-aligned in local space; rotation is handled elsewhere.
   */
  bbox(): BBox {
    const s = this.getSpec();

    const halfW = s.lead + s.bodyW / 2;
    const halfH = Math.max(s.bodyH / 2, 2); // keep a minimum thickness for easy clicking

    return { x: -halfW, y: -halfH, w: halfW * 2, h: halfH * 2 };
  }

  /**
   * Ports in world space (after rotation + translation).
   * This is what wiring / snapping logic uses.
   */
  portWorldPositions(inst: ComponentInstance): { name: string; pos: Point }[] {
    return this.ports().map((p) => {
      const r = rotatePoint(p.offset, inst.rotation);
      return {
        name: p.name,
        pos: { x: inst.pos.x + r.x, y: inst.pos.y + r.y },
      };
    });
  }

  /**
   * Render the component via the view renderer.
   * The renderer decides actual SVG output; the type only provides spec + state flags.
   */
  render(view: any, inst: ComponentInstance, opts: RenderOpts = {}): void {
    view.drawComponentSymbol(inst, this.symbolSpec(), {
      preview: !!opts.preview,
      selected: !!opts.selected,
    });
  }
}
