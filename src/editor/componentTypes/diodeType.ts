import type { ComponentType, SymbolSpec } from "../componentType";
import type { ComponentInstance, PortDef, BBox } from "../types";
import type { Point } from "../grid";
import { rotatePoint } from "../geom";

export class DiodeType implements ComponentType {
  typeId = "diode";
  displayName = "Diode";

  defaultParams(): Record<string, number> {
    return {};
  }

  symbolSpec(): SymbolSpec {
    return {
      kind: "diode",
      lead: 18,
      bodyW: 44,
      bodyH: 26,
      barW: 4,
    };
  }

  private getSpec() {
    const s = this.symbolSpec();
    if (s.kind !== "diode") throw new Error("Unexpected symbol kind");
    return s;
  }

  ports(): PortDef[] {
    const s = this.getSpec();
    const portOffset = s.lead + s.bodyW / 2;

    return [
      { name: "A", offset: { x: -portOffset, y: 0 } }, // anode
      { name: "K", offset: { x: +portOffset, y: 0 } }, // cathode
    ];
  }

  bbox(): BBox {
    const s = this.getSpec();
    const halfW = s.lead + s.bodyW / 2;
    const halfH = Math.max(s.bodyH / 2, 12);
    return { x: -halfW, y: -halfH, w: halfW * 2, h: halfH * 2 };
  }

  portWorldPositions(inst: ComponentInstance): { name: string; pos: Point }[] {
    return this.ports().map((p) => {
      const r = rotatePoint(p.offset, inst.rotation);
      return { name: p.name, pos: { x: inst.pos.x + r.x, y: inst.pos.y + r.y } };
    });
  }

  render(view: any, inst: ComponentInstance, opts = {}) {
    view.drawComponentSymbol(inst, this.symbolSpec(), opts);
  }
}