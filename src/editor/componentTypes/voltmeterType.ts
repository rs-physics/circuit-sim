import type { ComponentType, SymbolSpec } from "../componentType";
import type { ComponentInstance, PortDef, BBox } from "../types";
import type { Point } from "../grid";
import type { SimRole } from "../../sim/simRole";
import type { SimState } from "../../sim/simState";
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
      rotationMode: "readable",
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
   * Simulation role: ideal voltmeter.
   * Open circuit (infinite resistance) — never stamped into the MNA matrix.
   * Its reading is computed separately as the voltage difference between
   * its two nodes, read directly from the solved node voltages.
   */
  simRole(_inst: ComponentInstance): SimRole {
    return { kind: "voltmeter" };
  }

  /**
   * Display the voltmeter's reading: voltage difference between its
   * two nodes, looked up from the latest solved circuit.
   * Returns null if there's no solved circuit yet, or this component
   * isn't part of the current graph for some reason.
   */
  displayLabel(inst: ComponentInstance, simState: SimState): string | null {
    if (!simState.solved || !simState.graph) return null;

    const branch = simState.graph.branches.find((b) => b.componentId === inst.id);
    if (!branch) return null;

    const vA = simState.solved.nodeVoltages.get(branch.nodeAId);
    const vB = simState.solved.nodeVoltages.get(branch.nodeBId);
    if (vA === undefined || vB === undefined) return null;

    return `${(vA - vB).toFixed(2)} V`;
  }

  displayLabelOffset(_inst: ComponentInstance): Point {
    return { x: 0, y: - 30 };
  }
}