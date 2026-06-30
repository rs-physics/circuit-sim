import type { ComponentType, SymbolSpec } from "../componentType";
import type { ComponentInstance, PortDef, BBox } from "../types";
import type { Point } from "../grid";
import { rotatePoint } from "../geom";
import type {SimRole} from "../../sim/simRole.ts";
import type {SimState} from "../../sim/simState.ts";

const DEFAULT_BATTERY_V = 9;

export class BatteryType implements ComponentType {
  typeId = "battery";
  displayName = "Battery";

  defaultParams(): Record<string, number> {
    return { V: DEFAULT_BATTERY_V };
  }

  symbolSpec(): SymbolSpec {
    return {
      kind: "battery",
      lead: 42.5,        // 65 + (20/2) = 75 → 3 * 25 grid alignment
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

  /**
   * Simulation role: ideal voltage source.
   * V is taken from instance params.
   *
   * Polarity convention: port "+" is the positive terminal.
   * MNA will orient the voltage source accordingly when stamping.
   */

  simRole(inst: ComponentInstance): SimRole {
    let voltage: number;

    if (inst.params.V !== undefined && inst.params.V !== null) {
      voltage = inst.params.V;
    }
    else {
      voltage = DEFAULT_BATTERY_V;
    }

    return {
      kind: "voltageSource",
      V: voltage,
    };
  }

  /**
   * Display the battery's voltage value. Purely read-only for now —
   * clicking to edit this value is a separate, later feature.
   */
  displayLabel(inst: ComponentInstance, _simState: SimState): string | null {
    const v = inst.params.V ?? 1;
    return `${v} V`;
  }

  displayLabelOffset(_inst: ComponentInstance): Point {
    return { x: -25, y: -20 };
  }

}
