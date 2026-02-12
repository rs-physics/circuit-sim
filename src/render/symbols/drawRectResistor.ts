import type { Point } from "../../editor/grid";
import type { RectResistorSpec } from "../../editor/componentType";
import type { SymbolDrawFlags } from "./types";
import { svgEl } from "../svgEl";

export function buildRectResistorGroup(
  center: Point,
  rotationDeg: number,
  spec: RectResistorSpec,
  flags: SymbolDrawFlags
): SVGGElement {
  const { preview, selected } = flags;

  const w = spec.bodyW;
  const h = spec.bodyH;
  const lead = spec.lead;

  const g = svgEl("g", {
    transform: `translate(${center.x} ${center.y}) rotate(${rotationDeg})`,
    opacity: preview ? "0.45" : "1",
  });

  if (selected && !preview) {
    const halfW = spec.lead + spec.bodyW / 2;
    const halfH = Math.max(spec.bodyH / 2, 2);
    const pad = 10;

    g.appendChild(
      svgEl("rect", {
        x: `${-halfW - pad}`,
        y: `${-halfH - pad}`,
        width: `${(halfW + pad) * 2}`,
        height: `${(halfH + pad) * 2}`,
        fill: "none",
        stroke: "#1e90ff",
        "stroke-width": "1",
        "stroke-dasharray": "4 3",
        "pointer-events": "none",
      })
    );
  }

  g.appendChild(
    svgEl("line", {
      x1: `${-lead - w / 2}`,
      y1: "0",
      x2: `${-w / 2}`,
      y2: "0",
      stroke: "black",
      "stroke-width": "2",
    })
  );

  g.appendChild(
    svgEl("line", {
      x1: `${w / 2}`,
      y1: "0",
      x2: `${lead + w / 2}`,
      y2: "0",
      stroke: "black",
      "stroke-width": "2",
    })
  );

  g.appendChild(
    svgEl("rect", {
      x: `${-w / 2}`,
      y: `${-h / 2}`,
      width: `${w}`,
      height: `${h}`,
      fill: "white",
      stroke: "black",
      "stroke-width": "2",
    })
  );

  if (preview) g.setAttribute("pointer-events", "none");
  return g;
}
