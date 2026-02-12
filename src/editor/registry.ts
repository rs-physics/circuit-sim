/**
 * Component Type Registry
 *
 * This module is the single source of truth for:
 *  - Which component types exist in the system
 *  - How they are looked up by typeId
 *
 * Think of this as a simple plugin registry.
 * New component types get registered here once,
 * and the rest of the app can query them generically.
 */

import type { ComponentType } from "./componentType";
import { ResistorType } from "./componentTypes/resistorType";
import { BatteryType } from "./componentTypes/batteryType";
import { BulbType } from "./componentTypes/bulbType";
import { CapacitorType } from "./componentTypes/capacitorType";
import { SwitchType } from "./componentTypes/switchType";
import { VarResistorType } from "./componentTypes/varResistorType";
import { AmmeterType } from "./componentTypes/ammeterType";
import { VoltmeterType } from "./componentTypes/voltmeterType";


// -----------------------------------------------------------------------------
// Component Type Instances
// -----------------------------------------------------------------------------

// Create one instance per component type.
// These are effectively singletons for the lifetime of the app.
const resistor = new ResistorType();
const battery = new BatteryType();
const bulb = new BulbType();
const capacitor = new CapacitorType();
const sw = new SwitchType();
const varRes = new VarResistorType();
const ammeter = new AmmeterType();
const voltmeter = new VoltmeterType();

/**
 * Internal map of typeId → ComponentType
 *
 * Key:  unique string identifier (e.g. "resistor")
 * Value: concrete ComponentType implementation
 */
const types = new Map<string, ComponentType>([
  [resistor.typeId, resistor],
  [battery.typeId, battery],
  [bulb.typeId, bulb],
  [capacitor.typeId, capacitor],
  [sw.typeId, sw],
  [varRes.typeId, varRes],
  [ammeter.typeId, ammeter],
  [voltmeter.typeId, voltmeter],
]);

// -----------------------------------------------------------------------------
// Public API
// -----------------------------------------------------------------------------

/**
 * Retrieve a component type by its typeId.
 *
 * Used whenever:
 *  - Rendering a component
 *  - Calculating ports
 *  - Creating a new instance
 */
export function getComponentType(typeId: string): ComponentType {
  const t = types.get(typeId);
  if (!t) {
    throw new Error(`Unknown component type: ${typeId}`);
  }
  return t;
}

/**
 * Return all registered component types.
 *
 * Used for:
 *  - Populating the toolbar dropdown
 *  - Future component palettes
 */
export function listComponentTypes(): ComponentType[] {
  return Array.from(types.values());
}
