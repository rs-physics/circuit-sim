import type { ComponentType, SymbolSpec } from "../componentType";
import type { ComponentInstance, PortDef, BBox } from "../types";
import type { Point } from "../grid";
import { rotatePoint } from "../geom";

export class CapacitorType implements ComponentType {
  typeId = "capacitor";
  displayName = "Capacitor";

  defaultParams(): Record<string, number> {
    return { C: 1 }; // placeholder (we can treat as µF later if you want)
  }

  symbolSpec(): SymbolSpec {
    return {
      kind: "capacitor",
      lead: 67.5,     // keeps ports at ±75 with plateGap=15
      plateGap: 15,
      plateH: 60,
    };
  }

  private getSpec() {
    const s = this.symbolSpec();
    if (s.kind !== "capacitor") throw new Error("Unexpected symbol kind");
    return s;
  }

  ports(): PortDef[] {
    const s = this.getSpec();
    const portOffset = s.lead + s.plateGap / 2;

    return [
      { name: "A", offset: { x: -portOffset, y: 0 } },
      { name: "B", offset: { x: +portOffset, y: 0 } },
    ];
  }

  bbox(): BBox {
    const s = this.getSpec();
    const halfW = s.lead + s.plateGap / 2;
    const halfH = Math.max(s.plateH / 2, 10);
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
