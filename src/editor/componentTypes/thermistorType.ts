import type { ComponentType, SymbolSpec } from "../componentType";
import type { ComponentInstance, PortDef, BBox } from "../types";
import type { Point } from "../grid";
import { rotatePoint } from "../geom";

export class ThermistorType implements ComponentType {
  typeId = "thermistor";
  displayName = "Thermistor";

  defaultParams(): Record<string, number> {
    // Keep it simple for now; you can later expand to R25/Beta etc.
    return { R: 10000 };
  }

  symbolSpec(): SymbolSpec {
    return {
      kind: "thermistor",
      bodyW: 70,
      bodyH: 28,
      lead: 15,
      slashPad: 14, // extra room for the diagonal thermistor slash
    };
  }

  private getSpec() {
    const s = this.symbolSpec();
    if (s.kind !== "thermistor") throw new Error("Unexpected symbol kind");
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
    const halfH = Math.max(s.bodyH / 2 + 10, 12); // slash rises a bit
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