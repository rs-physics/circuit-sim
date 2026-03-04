import type { Point } from "../../editor/grid";
import type { LdrSpec } from "../../editor/componentType";
import type { SymbolDrawFlags } from "./types";
import { svgEl } from "../svgEl";

export function buildLdrGroup(
  center: Point,
  rotationDeg: number,
  spec: LdrSpec,
  flags: SymbolDrawFlags
): SVGGElement {
  const { preview, selected } = flags;

  const w = spec.bodyW;
  const h = spec.bodyH;
  const lead = spec.lead;
  const r = Math.max(w, h) * 0.62; // circle radius (tweak 0.6–0.7)

  const arrowPad = spec.arrowPad;
  const arrowLen = spec.arrowLen;

  const halfW = Math.max(lead + w / 2, r);
  const halfH = Math.max(r, h / 2, 2);

  const g = svgEl("g", {
    transform: `translate(${center.x} ${center.y}) rotate(${rotationDeg})`,
    opacity: preview ? "0.45" : "1",
  });

  // selection bbox (room for arrows above)
  if (selected && !preview) {
    const selPad = 10;
    g.appendChild(
      svgEl("rect", {
        x: `${-halfW - selPad}`,
        y: `${-halfH - selPad}`,
        width: `${(halfW + selPad) * 2}`,
        height: `${(halfH + selPad) * 2}`,
        fill: "none",
        stroke: "#1e90ff",
        "stroke-width": "1",
        "stroke-dasharray": "4 3",
        "pointer-events": "none",
      })
    );
  }

      // circle around resistor (LDR body)
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



  // body (same as rect resistor)
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

  // --- Light arrows (pointing TOWARD the resistor) ---
  // We'll draw two parallel arrows from upper-left toward the body.
  // Arrow tail starts outside, arrow tip ends near the resistor.
  const startX = -w / 2 - arrowPad - arrowLen;
  const startY1 = -h / 2 - arrowPad - 8;
  const startY2 = startY1 + 12;

  const endX = -w / 2 - arrowPad;
  const endY1 = startY1 + 10;
  const endY2 = startY2 + 10;

  const drawArrow = (x1: number, y1: number, x2: number, y2: number) => {
    // shaft
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

    // arrow head: "V" at (x2,y2)
    const dx = x2 - x1;
    const dy = y2 - y1;
    const len = Math.hypot(dx, dy) || 1;
    const ux = dx / len;
    const uy = dy / len;

    const headLen = 7;
    const theta = Math.PI / 6; // 30 degrees

    const rx1 = ux * Math.cos(theta) - uy * Math.sin(theta);
    const ry1 = ux * Math.sin(theta) + uy * Math.cos(theta);

    const rx2 = ux * Math.cos(-theta) - uy * Math.sin(-theta);
    const ry2 = ux * Math.sin(-theta) + uy * Math.cos(-theta);

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
  };

  drawArrow(startX, startY1, endX, endY1);
  drawArrow(startX, startY2, endX, endY2);

  if (preview) g.setAttribute("pointer-events", "none");
  return g;
}