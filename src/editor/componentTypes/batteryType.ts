import type { ComponentType, SymbolSpec } from "../componentType";
import type { ComponentInstance, PortDef, BBox } from "../types";
import type { Point } from "../grid";
import { rotatePoint } from "../geom";

export class BatteryType implements ComponentType {
  typeId = "battery";
  displayName = "Battery";

  defaultParams(): Record<string, number> {
    return { V: 9 };
  }

  symbolSpec(): SymbolSpec {
    return {
      kind: "battery",
      lead: 67.5,        // 65 + (20/2) = 75 → 3 * 25 grid alignment
      plateGap: 15,
      longPlate: 60,
      shortPlate: 20,
    };
  }

  private getSpec() {
    const s = this.symbolSpec();
    if (s.kind !== "battery") throw new Error("Unexpected symbol kind");
    return s;
  }

  ports(): PortDef[] {
    const s = this.getSpec();
    const portOffset = s.lead + s.plateGap / 2;

    return [
      { name: "+", offset: { x: -portOffset, y: 0 } },
      { name: "-", offset: { x: +portOffset, y: 0 } },
    ];
  }

  bbox(): BBox {
    const s = this.getSpec();

    const halfW = s.lead + s.plateGap / 2;
    const halfH = Math.max(s.longPlate / 2, 10);

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
