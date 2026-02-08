import type { ComponentInstance, PortDef, BBox } from "./types";
import type { Point } from "./grid";
import type { SchematicSvg } from "../render/schematicSvg";

export type RenderOpts = {
  preview?: boolean;
  selected?: boolean;
};

export type RectResistorSpec = {
  kind: "rectResistor";
  bodyW: number;
  bodyH: number;
  lead: number;
};

export type SymbolSpec = RectResistorSpec;


export interface ComponentType {
  typeId: string;
  displayName: string;

  defaultParams(): Record<string, number>;
  symbolSpec(): SymbolSpec;

  ports(): PortDef[];
  bbox(): BBox;

  render(view: SchematicSvg, inst: ComponentInstance, opts?: RenderOpts): void;
  portWorldPositions(inst: ComponentInstance): { name: string; pos: Point }[];
}