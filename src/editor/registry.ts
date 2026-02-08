import type { ComponentType } from "./componentType";
import { ResistorType } from "./componentTypes/resistorType";

const resistor = new ResistorType();

const types = new Map<string, ComponentType>([
  [resistor.typeId, resistor],
]);

export function getComponentType(typeId: string): ComponentType {
  const t = types.get(typeId);
  if (!t) throw new Error(`Unknown component type: ${typeId}`);
  return t;
}

export function listComponentTypes(): ComponentType[] {
  return Array.from(types.values());
}