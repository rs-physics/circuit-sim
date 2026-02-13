import type { ComponentType, SymbolSpec } from "../componentType";
import type { ComponentInstance, PortDef, BBox } from "../types";
import type { Point } from "../grid";
import { rotatePoint } from "../geom";

export class VarResistorType implements ComponentType {
  typeId = "varResistor";
  displayName = "Var. Resistor";

  defaultParams(): Record<string, number> {
    return { R: 100 };
  }

  symbolSpec(): SymbolSpec {
    return {
      kind: "varResistor",
      bodyW: 70,
      bodyH: 28,
      lead: 15,
      arrowPad: 14,
    };
  }

  private getSpec() {
    const s = this.symbolSpec();
    if (s.kind !== "varResistor") throw new Error("Unexpected symbol kind");
    return s;
  }

  ports(): PortDef[] {
    const s = this.getSpec();
    const portOffset = s.lead + s.bodyW / 2;

    return [
      { name: "A", offset: { x: -portOffset, y: 0 } },
      { name: "B", offset: { x: +portOffset, y: 0 } },
    ];
  }

  bbox(): BBox {
    const s = this.getSpec();
    const halfW = s.lead + s.bodyW / 2;
    // arrow rises above a bit, so bump height slightly
    const halfH = Math.max(s.bodyH / 2 + 14, 12);

    return { x: -halfW, y: -halfH, w: halfW * 2, h: halfH * 2 };
  }

  portWorldPositions(inst: ComponentInstance): { name: string; pos: Point }[] {
    return this.ports().map((p) => {
      const r = rotatePoint(p.offset, inst.rotation);
      return {
        name: p.name,
        pos: { x: inst.pos.x + r.x, y: inst.pos.y + r.y },
      };
    });
  }

  render(view: any, inst: ComponentInstance, opts = {}) {
    view.drawComponentSymbol(inst, this.symbolSpec(), opts);
  }
}
