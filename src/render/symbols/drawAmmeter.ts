import type { Point } from "../../editor/grid";
import type { AmmeterSpec } from "../../editor/componentType";
import type { SymbolDrawFlags } from "./types";
import { svgEl } from "../svgEl";

export function buildAmmeterGroup(
  center: Point,
  rotationDeg: number,
  spec: AmmeterSpec,
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

  // "A" (simple schematic-style strokes)
  // Draw as two legs + crossbar
  const topY = -r * 0.55;
  const baseY = r * 0.55;
  const halfW = r * 0.40;
  const barY = r * 0.13;

  g.appendChild(
    svgEl("line", {
      x1: `${-halfW}`,
      y1: `${baseY}`,
      x2: "0",
      y2: `${topY}`,
      stroke: "black",
      "stroke-width": "2",
      "stroke-linecap": "round",
    })
  );
  g.appendChild(
    svgEl("line", {
      x1: `${halfW}`,
      y1: `${baseY}`,
      x2: "0",
      y2: `${topY}`,
      stroke: "black",
      "stroke-width": "2",
      "stroke-linecap": "round",
    })
  );
  g.appendChild(
    svgEl("line", {
      x1: `${-halfW * 0.65}`,
      y1: `${barY}`,
      x2: `${halfW * 0.65}`,
      y2: `${barY}`,
      stroke: "black",
      "stroke-width": "2",
      "stroke-linecap": "round",
    })
  );

  if (preview) g.setAttribute("pointer-events", "none");
  return g;
}
