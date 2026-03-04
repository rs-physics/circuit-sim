import type { ComponentType, SymbolSpec } from "../componentType";
import type { ComponentInstance, PortDef, BBox } from "../types";
import type { Point } from "../grid";
import { rotatePoint } from "../geom";

export class LdrType implements ComponentType {
  typeId = "ldr";
  displayName = "LDR";

  defaultParams(): Record<string, number> {
    // Placeholder for later simulation use
    return { R: 10000 };
  }

  symbolSpec(): SymbolSpec {
    return {
      kind: "ldr",
      bodyW: 70,
      bodyH: 28,
      lead: 15,
      arrowPad: 16,   // how far arrows sit from the body
      arrowLen: 14,   // arrow length
    };
  }

  private getSpec() {
    const s = this.symbolSpec();
    if (s.kind !== "ldr") throw new Error("Unexpected symbol kind");
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

    // arrows sit above-left typically, so allow extra headroom
    const extra = s.arrowPad + s.arrowLen + 8;
    const halfH = Math.max(s.bodyH / 2 + extra, 12);

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