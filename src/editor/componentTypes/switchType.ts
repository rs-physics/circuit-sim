import type { ComponentType, SymbolSpec } from "../componentType";
import type { ComponentInstance, PortDef, BBox } from "../types";
import type { Point } from "../grid";
import { rotatePoint } from "../geom";

export class SwitchType implements ComponentType {
  typeId = "switch";
  displayName = "Switch";

  defaultParams(): Record<string, number> {
    return { closed: 0 }; // 0=open, 1=closed (we’ll draw open for now)
  }

  symbolSpec(): SymbolSpec {
    return {
      kind: "switch",
      lead: 25,        // grid aligned with contactGap=50
      contactGap: 50,
      leverLen: 46,
      leverRise: 18,     // “open” look
    };
  }

  private getSpec() {
    const s = this.symbolSpec();
    if (s.kind !== "switch") throw new Error("Unexpected symbol kind");
    return s;
  }

  ports(): PortDef[] {
    const s = this.getSpec();
    const portOffset = s.lead + s.contactGap / 2;

    return [
      { name: "A", offset: { x: -portOffset, y: 0 } },
      { name: "B", offset: { x: +portOffset, y: 0 } },
    ];
  }

  bbox(): BBox {
    const s = this.getSpec();
    const halfW = s.lead + s.contactGap / 2;

    // include leverRise so selection box doesn’t clip the lever
    const halfH = Math.max(s.leverRise, 10);

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
