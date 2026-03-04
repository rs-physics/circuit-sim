import type { Point } from "../../editor/grid";
import type { LedSpec } from "../../editor/componentType";
import type { SymbolDrawFlags } from "./types";
import { svgEl } from "../svgEl";

export function buildLedGroup(
  center: Point,
  rotationDeg: number,
  spec: LedSpec,
  flags: SymbolDrawFlags
): SVGGElement {
  const { preview, selected } = flags;

  const lead = spec.lead;
  const w = spec.bodyW;
  const h = spec.bodyH;
  const barW = spec.barW;

  const arrowPad = spec.arrowPad;
  const arrowLen = spec.arrowLen;

  const halfW = lead + w / 2;
  const halfH = Math.max(h / 2, 2);

  const g = svgEl("g", {
    transform: `translate(${center.x} ${center.y}) rotate(${rotationDeg})`,
    opacity: preview ? "0.45" : "1",
  });

  // selection bbox (room for arrows to the upper-right)
  if (selected && !preview) {
    const selPad = 10;
    const extraTop = arrowPad + arrowLen + 14;
    const extraRight = arrowPad + arrowLen + 14;

    g.appendChild(
      svgEl("rect", {
        x: `${-halfW - selPad}`,
        y: `${-halfH - selPad - extraTop}`,
        width: `${(halfW + selPad) * 2 + extraRight}`,
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

  // diode triangle (anode left, pointing right)
  const xL = -w / 2;
  const xR = +w / 2 - barW - 2;
  const yT = -h / 2;
  const yB = +h / 2;

  g.appendChild(
    svgEl("polygon", {
      points: `${xL},0 ${xR},${yT} ${xR},${yB}`,
      fill: "white",
      stroke: "black",
      "stroke-width": "2",
      "stroke-linejoin": "round",
    })
  );

  // cathode bar
  const barX = +w / 2 - barW;
  g.appendChild(
    svgEl("rect", {
      x: `${barX}`,
      y: `${-h / 2}`,
      width: `${barW}`,
      height: `${h}`,
      fill: "black",
    })
  );

  // --- LED emission arrows (pointing OUTWARD) ---
  const drawArrow = (x1: number, y1: number, x2: number, y2: number) => {
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

    const dx = x2 - x1;
    const dy = y2 - y1;
    const len = Math.hypot(dx, dy) || 1;
    const ux = dx / len;
    const uy = dy / len;

    const headLen = 7;
    const theta = Math.PI / 6;

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

  // Place arrows above-right of diode
  const baseX = +w / 2 + arrowPad;
  const baseY1 = -h / 2 - arrowPad;
  const baseY2 = baseY1 + 12;

  // Arrows go up-right
  drawArrow(baseX, baseY1, baseX + arrowLen, baseY1 - arrowLen * 0.6);
  drawArrow(baseX, baseY2, baseX + arrowLen, baseY2 - arrowLen * 0.6);

  if (preview) g.setAttribute("pointer-events", "none");
  return g;
}