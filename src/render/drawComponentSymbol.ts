import type { Point } from "../editor/grid";
import type { SymbolSpec } from "../editor/componentType";
import type { SymbolDrawFlags } from "./symbols/types";
import { buildRectResistorGroup } from "./symbols/drawRectResistor";
import { buildBatteryGroup } from "./symbols/drawBattery";
import { buildBulbGroup } from "./symbols/drawBulb";
import { buildCapacitorGroup } from "./symbols/drawCapacitor";
import { buildSwitchGroup } from "./symbols/drawSwitch";
import { buildVarResistorGroup } from "./symbols/drawVarResistor";
import { buildThermistorGroup } from "./symbols/drawThermistor";
import { buildLdrGroup } from "./symbols/drawLdr";
import { buildAmmeterGroup } from "./symbols/drawAmmeter";
import { buildVoltmeterGroup } from "./symbols/drawVoltmeter";
import { buildDiodeGroup } from "./symbols/drawDiode";
import { buildLedGroup } from "./symbols/drawLed";


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

    case "thermistor":
      return buildThermistorGroup(center, rotationDeg, spec, flags);

    case "ldr":
      return buildLdrGroup(center, rotationDeg, spec, flags);

    case "diode":
      return buildDiodeGroup(center, rotationDeg, spec, flags);

    case "led":
      return buildLedGroup(center, rotationDeg, spec, flags);

    case "ammeter":
      return buildAmmeterGroup(center, rotationDeg, spec, flags);

    case "voltmeter":
      return buildVoltmeterGroup(center, rotationDeg, spec, flags);

  }

  throw new Error(`Unsupported symbol kind: ${(spec as any).kind}`);
}
