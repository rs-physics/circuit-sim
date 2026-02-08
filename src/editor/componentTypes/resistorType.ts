import type { ComponentType, RenderOpts, SymbolSpec } from "../componentType";
import type { ComponentInstance, PortDef, BBox } from "../types";
import type { Point } from "../grid";
import { rotatePoint } from "../geom";

export class ResistorType implements ComponentType {
  typeId = "resistor";
  displayName = "Resistor";

  defaultParams(): Record<string, number> {
    return { R: 100 };
  }

  symbolSpec(): SymbolSpec {
    // Single source of truth for geometry:
    // Make ports land on grid: with grid=25, we want port offset = 75 (3*25)
    // lead + bodyW/2 = 75 -> choose lead=40, bodyW=70
    return {
      kind: "rectResistor",
      bodyW: 70,
      bodyH: 28,
      lead: 40,
    };
  }

  ports(): PortDef[] {
    const s = this.symbolSpec();
    if (s.kind !== "rectResistor") throw new Error("Unexpected symbol kind");

    const portOffset = s.lead + s.bodyW / 2;

    return [
      { name: "A", offset: { x: -portOffset, y: 0 } },
      { name: "B", offset: { x: +portOffset, y: 0 } },
    ];
  }

  bbox(): BBox {
    const s = this.symbolSpec();
    if (s.kind !== "rectResistor") throw new Error("Unexpected symbol kind");

    const halfW = s.lead + s.bodyW / 2;
    const halfH = Math.max(s.bodyH / 2, 2);
    return { x: -halfW, y: -halfH, w: halfW * 2, h: halfH * 2 };
  }

  portWorldPositions(inst: ComponentInstance): { name: string; pos: Point }[] {
    return this.ports().map((p) => {
      const r = rotatePoint(p.offset, inst.rotation);
      return { name: p.name, pos: { x: inst.pos.x + r.x, y: inst.pos.y + r.y } };
    });
  }

  render(view: any, inst: ComponentInstance, opts: RenderOpts = {}): void {
    view.drawComponentSymbol(inst, this.symbolSpec(), {
      preview: !!opts.preview,
      selected: !!opts.selected,
    });
  }
}