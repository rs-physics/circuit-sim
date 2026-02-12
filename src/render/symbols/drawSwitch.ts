import type { Point } from "../../editor/grid";
import type { SwitchSpec } from "../../editor/componentType";
import type { SymbolDrawFlags } from "./types";
import { svgEl } from "../svgEl";

export function buildSwitchGroup(
  center: Point,
  rotationDeg: number,
  spec: SwitchSpec,
  flags: SymbolDrawFlags
): SVGGElement {
  const { preview, selected } = flags;

  const lead = spec.lead;
  const gap = spec.contactGap;
  const leverLen = spec.leverLen;
  const rise = spec.leverRise;

  const xL = -gap / 2;
  const xR = +gap / 2;
  const portX = gap / 2 + lead;

  const g = svgEl("g", {
    transform: `translate(${center.x} ${center.y}) rotate(${rotationDeg})`,
    opacity: preview ? "0.45" : "1",
  });

  // selection bbox
  if (selected && !preview) {
    const pad = 10;
    const halfW = portX;
    const halfH = Math.max(rise, 10);

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

  // leads to contacts
  g.appendChild(
    svgEl("line", {
      x1: `${-portX}`,
      y1: "0",
      x2: `${xL}`,
      y2: "0",
      stroke: "black",
      "stroke-width": "2",
      "stroke-linecap": "round",
    })
  );

  g.appendChild(
    svgEl("line", {
      x1: `${xR}`,
      y1: "0",
      x2: `${portX}`,
      y2: "0",
      stroke: "black",
      "stroke-width": "2",
      "stroke-linecap": "round",
    })
  );

  // contact dots
  g.appendChild(svgEl("circle", { cx: `${xL}`, cy: "0", r: "2", fill: "black" }));
  g.appendChild(svgEl("circle", { cx: `${xR}`, cy: "0", r: "2", fill: "black" }));

  // lever (open): from left contact towards right, angled up
  g.appendChild(
    svgEl("line", {
      x1: `${xL}`,
      y1: "0",
      x2: `${xL + leverLen}`,
      y2: `${-rise}`,
      stroke: "black",
      "stroke-width": "2",
      "stroke-linecap": "round",
    })
  );

  if (preview) g.setAttribute("pointer-events", "none");
  return g;
}
