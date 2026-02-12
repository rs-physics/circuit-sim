import type { Point } from "../../editor/grid";
import type { VoltmeterSpec } from "../../editor/componentType";
import type { SymbolDrawFlags } from "./types";
import { svgEl } from "../svgEl";

export function buildVoltmeterGroup(
  center: Point,
  rotationDeg: number,
  spec: VoltmeterSpec,
  flags: SymbolDrawFlags
): SVGGElement {
  const { preview, selected } = flags;

  const portX = spec.lead + spec.radius;
  const r = spec.radius;

  const g = svgEl("g", {
    transform: `translate(${center.x} ${center.y}) rotate(${rotationDeg})`,
    opacity: preview ? "0.45" : "1",
  });

  // selection bbox
  if (selected && !preview) {
    const pad = 10;
    g.appendChild(
      svgEl("rect", {
        x: `${-portX - pad}`,
        y: `${-r - pad}`,
        width: `${(portX + pad) * 2}`,
        height: `${(r + pad) * 2}`,
        fill: "none",
        stroke: "#1e90ff",
        "stroke-width": "1",
        "stroke-dasharray": "4 3",
        "pointer-events": "none",
      })
    );
  }

  // leads
  g.appendChild(
    svgEl("line", {
      x1: `${-portX}`,
      y1: "0",
      x2: `${-r}`,
      y2: "0",
      stroke: "black",
      "stroke-width": "2",
      "stroke-linecap": "round",
    })
  );
  g.appendChild(
    svgEl("line", {
      x1: `${r}`,
      y1: "0",
      x2: `${portX}`,
      y2: "0",
      stroke: "black",
      "stroke-width": "2",
      "stroke-linecap": "round",
    })
  );

  // circle
  g.appendChild(
    svgEl("circle", {
      cx: "0",
      cy: "0",
      r: `${r}`,
      fill: "white",
      stroke: "black",
      "stroke-width": "2",
    })
  );

  // "V"
  const topY = -r * 0.45;
  const bottomY = r * 0.55;
  const halfW = r * 0.40;

  g.appendChild(
    svgEl("line", {
      x1: `${-halfW}`,
      y1: `${topY}`,
      x2: "0",
      y2: `${bottomY}`,
      stroke: "black",
      "stroke-width": "2",
      "stroke-linecap": "round",
    })
  );

  g.appendChild(
    svgEl("line", {
      x1: `${halfW}`,
      y1: `${topY}`,
      x2: "0",
      y2: `${bottomY}`,
      stroke: "black",
      "stroke-width": "2",
      "stroke-linecap": "round",
    })
  );

  if (preview) g.setAttribute("pointer-events", "none");
  return g;
}
