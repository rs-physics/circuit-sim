import type { ComponentType, SymbolSpec } from "../componentType";
import type { ComponentInstance, PortDef, BBox } from "../types";
import type { Point } from "../grid";
import { rotatePoint } from "../geom";

export class VoltmeterType implements ComponentType {
  typeId = "voltmeter";
  displayName = "Voltmeter";

  defaultParams(): Record<string, number> {
    return {};
  }

  symbolSpec(): SymbolSpec {
    return {
      kind: "voltmeter",
      lead: 28,
      radius: 22,
    };
  }

  private getSpec() {
    const s = this.symbolSpec();
    if (s.kind !== "voltmeter") throw new Error("Unexpected symbol kind");
    return s;
  }

  ports(): PortDef[] {
    const s = this.getSpec();
    const portOffset = s.lead + s.radius;
    return [
      { name: "A", offset: { x: -portOffset, y: 0 } },
      { name: "B", offset: { x: +portOffset, y: 0 } },
    ];
  }

  bbox(): BBox {
    const s = this.getSpec();
    const halfW = s.lead + s.radius;
    const halfH = s.radius;
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
