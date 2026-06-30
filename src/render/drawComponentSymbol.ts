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
import { symbolDisplayRotation } from "./readableRotation";


export function buildSymbolGroup(
    center: Point,
    rotationDeg: number,
    spec: SymbolSpec,
    flags: SymbolDrawFlags
): SVGGElement {
  const visualRotationDeg = symbolDisplayRotation(
      rotationDeg,
      spec.rotationMode ?? "full"
  );

  switch (spec.kind) {
    case "rectResistor":
      return buildRectResistorGroup(center, visualRotationDeg, spec, flags);

    case "battery":
      return buildBatteryGroup(center, visualRotationDeg, spec, flags);

    case "bulb":
      return buildBulbGroup(center, visualRotationDeg, spec, flags);

    case "capacitor":
      return buildCapacitorGroup(center, visualRotationDeg, spec, flags);

    case "switch":
      return buildSwitchGroup(center, visualRotationDeg, spec, flags);

    case "varResistor":
      return buildVarResistorGroup(center, visualRotationDeg, spec, flags);

    case "thermistor":
      return buildThermistorGroup(center, visualRotationDeg, spec, flags);

    case "ldr":
      return buildLdrGroup(center, visualRotationDeg, spec, flags);

    case "diode":
      return buildDiodeGroup(center, visualRotationDeg, spec, flags);

    case "led":
      return buildLedGroup(center, visualRotationDeg, spec, flags);

    case "ammeter":
      return buildAmmeterGroup(center, visualRotationDeg, spec, flags);

    case "voltmeter":
      return buildVoltmeterGroup(center, visualRotationDeg, spec, flags);
  }

  throw new Error(`Unsupported symbol kind: ${(spec as any).kind}`);
}
