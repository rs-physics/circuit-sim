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
  const GRID = 25;
  const halfBody = w / 2;
  const halfWTarget = Math.round((halfBody + lead) / GRID) * GRID;
  const leadDraw = Math.max(0, halfWTarget - halfBody);

  const arrowPad = spec.arrowPad;
  const arrowLen = spec.arrowLen;

  const halfW = lead + w / 2;
  const halfH = Math.max(h / 2, 2);

  const g = svgEl("g", {
    transform: `translate(${center.x} ${center.y}) rotate(${rotationDeg})`,
    opacity: preview ? "0.45" : "1",
  });

  // selection bbox (room for arrows above and below)
  if (selected && !preview) {
    const selPad = 10;
    const extraTop = arrowPad + arrowLen;

    g.appendChild(
      svgEl("rect", {
        x: `${-halfW - selPad}`,
        y: `${-halfH - selPad - extraTop}`,
        width: `${(halfW + selPad) * 2}`,
        height: `${(halfH + selPad) * 2 + extraTop * 2}`,
        fill: "none",
        stroke: "#1e90ff",
        "stroke-width": "1",
        "stroke-dasharray": "4 3",
        "pointer-events": "none",
      })
    );
  }

  // leads (snapped so ports land on GRID)
  g.appendChild(
    svgEl("line", {
      x1: `${-leadDraw - w / 2}`,
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
      x2: `${leadDraw + w / 2}`,
      y2: "0",
      stroke: "black",
      "stroke-width": "2",
      "stroke-linecap": "round",
    })
  );

  // --- Diode body (LED = diode + emission arrows) ---
  const barX = +w / 2 - barW;  // cathode bar zone starts here (right)
  const xL = -w / 2;          // triangle base x (left edge)
  const xR = barX + 1;            // triangle tip touches the bar (NO GAP)

  const triScale = 1.45;
  const yT = -(h / 2) * triScale;
  const yB = +(h / 2) * triScale;

  // diode triangle: base vertical on left, tip on right
  g.appendChild(
    svgEl("polygon", {
      points: `${xL},${yT} ${xL},${yB} ${xR},0`,
      fill: "white",
      stroke: "black",
      "stroke-width": "2",
      "stroke-linejoin": "round",
    })
  );

  // cathode bar as stroke line (same height as triangle)
  const barCenterX = barX + barW / 2;
  g.appendChild(
    svgEl("line", {
      x1: `${barCenterX}`,
      y1: `${yT}`,
      x2: `${barCenterX}`,
      y2: `${yB}`,
      stroke: "black",
      "stroke-width": "2",
      "stroke-linecap": "round",
    })
  );

  // --- LED emission arrows (pointing OUTWARD) ---
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
  // Use yT (triangle top) as reference so arrows scale with triScale.
  const baseX = +w / 2 + arrowPad;
  const baseY1 = yT - arrowPad;
  const baseY2 = baseY1 + 12;

  // Arrows go up-right
  drawArrow(baseX, baseY1, baseX + arrowLen, baseY1 - arrowLen * 0.6);
  drawArrow(baseX, baseY2, baseX + arrowLen, baseY2 - arrowLen * 0.6);

  if (preview) g.setAttribute("pointer-events", "none");
  return g;
}