import type { Point } from "../editor/grid";
import type { SymbolSpec } from "../editor/componentType";
import type { SymbolDrawFlags } from "./symbols/types";
import { buildRectResistorGroup } from "./symbols/drawRectResistor";
import { buildBatteryGroup } from "./symbols/drawBattery";
import { buildBulbGroup } from "./symbols/drawBulb";
import { buildCapacitorGroup } from "./symbols/drawCapacitor";
import { buildSwitchGroup } from "./symbols/drawSwitch";
import { buildVarResistorGroup } from "./symbols/drawVarResistor";
import { buildAmmeterGroup } from "./symbols/drawAmmeter";
import { buildVoltmeterGroup } from "./symbols/drawVoltmeter";


export function buildSymbolGroup(
  center: Point,
  rotationDeg: number,
  spec: SymbolSpec,
  flags: SymbolDrawFlags
): SVGGElement {
  switch (spec.kind) {
    case "rectResistor":
      return buildRectResistorGroup(center, rotationDeg, spec, flags);

    case "battery":
      return buildBatteryGroup(center, rotationDeg, spec, flags);

    case "bulb":
      return buildBulbGroup(center, rotationDeg, spec, flags);
    
    case "capacitor":
      return buildCapacitorGroup(center, rotationDeg, spec, flags);
    
    case "switch":
      return buildSwitchGroup(center, rotationDeg, spec, flags);

    case "varResistor":
      return buildVarResistorGroup(center, rotationDeg, spec, flags);

    case "ammeter":
      return buildAmmeterGroup(center, rotationDeg, spec, flags);

    case "voltmeter":
      return buildVoltmeterGroup(center, rotationDeg, spec, flags);

  }

  throw new Error(`Unsupported symbol kind: ${(spec as any).kind}`);
}
