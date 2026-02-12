import type { Point } from "../../editor/grid";
import type { BulbSpec } from "../../editor/componentType";
import type { SymbolDrawFlags } from "./types";
import { svgEl } from "../svgEl";

export function buildBulbGroup(
  center: Point,
  rotationDeg: number,
  spec: BulbSpec,
  flags: SymbolDrawFlags
): SVGGElement {
  const { preview, selected } = flags;

  const portX = spec.lead + spec.radius;

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
        y: `${-spec.radius - pad}`,
        width: `${(portX + pad) * 2}`,
        height: `${(spec.radius + pad) * 2}`,
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
      x2: `${-spec.radius}`,
      y2: "0",
      stroke: "black",
      "stroke-width": "2",
    })
  );

  g.appendChild(
    svgEl("line", {
      x1: `${spec.radius}`,
      y1: "0",
      x2: `${portX}`,
      y2: "0",
      stroke: "black",
      "stroke-width": "2",
    })
  );

  // bulb circle
  g.appendChild(
    svgEl("circle", {
      cx: "0",
      cy: "0",
      r: `${spec.radius}`,
      fill: "white",
      stroke: "black",
      "stroke-width": "2",
    })
  );

    // cross filament (touches circle)
    const k = spec.radius / Math.SQRT2;

    g.appendChild(
    svgEl("line", {
        x1: `${-k}`,
        y1: `${-k}`,
        x2: `${k}`,
        y2: `${k}`,
        stroke: "black",
        "stroke-width": "2",
    })
    );

    g.appendChild(
    svgEl("line", {
        x1: `${-k}`,
        y1: `${k}`,
        x2: `${k}`,
        y2: `${-k}`,
        stroke: "black",
        "stroke-width": "2",
    })
    );


  if (preview) g.setAttribute("pointer-events", "none");

  return g;
}
