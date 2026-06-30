import type { ComponentType, SymbolSpec } from "../componentType";
import type { ComponentInstance, PortDef, BBox } from "../types";
import type { Point } from "../grid";
import type { SimRole } from "../../sim/simRole";
import type { SimState } from "../../sim/simState";
import { rotatePoint } from "../geom";

export class AmmeterType implements ComponentType {
  typeId = "ammeter";
  displayName = "Ammeter";

  defaultParams(): Record<string, number> {
    return {};
  }

  symbolSpec(): SymbolSpec {
    return {
      kind: "ammeter",
      lead: 28,
      radius: 22,
      rotationMode: "readable",
    };
  }

  private getSpec() {
    const s = this.symbolSpec();
    if (s.kind !== "ammeter") throw new Error("Unexpected symbol kind");
    return s;
  }

  ports(): PortDef[] {
    const s = this.getSpec();
    const portOffset = s.lead + s.radius;

    return [
      { name: "+", offset: { x: -portOffset, y: 0 } },
      { name: "-", offset: { x: +portOffset, y: 0 } },
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

  /**
   * Simulation role: ideal ammeter.
   * Modelled as a 0V voltage source in MNA so its branch current
   * becomes a solved unknown.
   */
  simRole(_inst: ComponentInstance): SimRole {
    return { kind: "ammeter" };
  }

  /**
   * Display the ammeter reading from sourceCurrents.
   * This value is the solved current through the 0V source.
   */
  displayLabel(inst: ComponentInstance, simState: SimState): string | null {
    if (!simState.solved) return null;

    const current = simState.solved.sourceCurrents.get(inst.id);
    if (current === undefined) return null;

    return `${(current * 1000).toFixed(2)} mA`;
  }

  displayLabelOffset(_inst: ComponentInstance): Point {
    return { x: 0, y: - 30 };
  }
}