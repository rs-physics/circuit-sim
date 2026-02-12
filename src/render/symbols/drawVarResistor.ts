import type { Point } from "../../editor/grid";
import type { VarResistorSpec } from "../../editor/componentType";
import type { SymbolDrawFlags } from "./types";
import { svgEl } from "../svgEl";

export function buildVarResistorGroup(
  center: Point,
  rotationDeg: number,
  spec: VarResistorSpec,
  flags: SymbolDrawFlags
): SVGGElement {
  const { preview, selected } = flags;

  const w = spec.bodyW;
  const h = spec.bodyH;
  const lead = spec.lead;
  const pad = spec.arrowPad;

  const halfW = lead + w / 2;
  const halfH = Math.max(h / 2, 2);

  const g = svgEl("g", {
    transform: `translate(${center.x} ${center.y}) rotate(${rotationDeg})`,
    opacity: preview ? "0.45" : "1",
  });

  // selection bbox
  if (selected && !preview) {
    const selPad = 10;
    const extraTop = 16; // room for arrow head
    g.appendChild(
      svgEl("rect", {
        x: `${-halfW - selPad}`,
        y: `${-halfH - selPad - extraTop}`,
        width: `${(halfW + selPad) * 2}`,
        height: `${(halfH + selPad) * 2 + extraTop}`,
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
      x1: `${-lead - w / 2}`,
      y1: "0",
      x2: `${-w / 2}`,
      y2: "0",
      stroke: "black",
      "stroke-width": "2",
      "stroke-linecap": "round",
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
      "stroke-linecap": "round",
    })
  );

  // body
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

  // diagonal arrow (longer, sticks out)
  const x1 = -w / 2 - pad;
  const y1 = +h / 2 + pad * 0.6;
  const x2 = +w / 2 + pad;
  const y2 = -h / 2 - pad * 1.1;

  g.appendChild(
    svgEl("line", {
      x1: `${x1}`,
      y1: `${y1}`,
      x2: `${x2}`,
      y2: `${y2}`,
      stroke: "black",
      "stroke-width": "2",
      "stroke-linecap": "round",
    })
  );

// arrow head: two diagonal lines forming a "V"
const dx = x2 - x1;
const dy = y2 - y1;
const len = Math.hypot(dx, dy) || 1;

// unit direction along arrow
const ux = dx / len;
const uy = dy / len;

// arrowhead size + angle
const headLen = 8;
const theta = Math.PI / 6; // 30 degrees

// rotate (ux,uy) by ±theta, then flip back from the tip
const rx1 = ux * Math.cos(theta) - uy * Math.sin(theta);
const ry1 = ux * Math.sin(theta) + uy * Math.cos(theta);

const rx2 = ux * Math.cos(-theta) - uy * Math.sin(-theta);
const ry2 = ux * Math.sin(-theta) + uy * Math.cos(-theta);

// two lines from tip backwards
g.appendChild(
  svgEl("line", {
    x1: `${x2}`,
    y1: `${y2}`,
    x2: `${x2 - rx1 * headLen}`,
    y2: `${y2 - ry1 * headLen}`,
    stroke: "black",
    "stroke-width": "2",
    "stroke-linecap": "round",
  })
);

g.appendChild(
  svgEl("line", {
    x1: `${x2}`,
    y1: `${y2}`,
    x2: `${x2 - rx2 * headLen}`,
    y2: `${y2 - ry2 * headLen}`,
    stroke: "black",
    "stroke-width": "2",
    "stroke-linecap": "round",
  })
);


  if (preview) g.setAttribute("pointer-events", "none");
  return g;
}
