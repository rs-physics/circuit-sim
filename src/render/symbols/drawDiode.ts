import type { Point } from "../../editor/grid";
import type { DiodeSpec } from "../../editor/componentType";
import type { SymbolDrawFlags } from "./types";
import { svgEl } from "../svgEl";

export function buildDiodeGroup(
  center: Point,
  rotationDeg: number,
  spec: DiodeSpec,
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

  const halfW = lead + w / 2;
  const halfH = Math.max(h / 2, 2);

  const g = svgEl("g", {
    transform: `translate(${center.x} ${center.y}) rotate(${rotationDeg})`,
    opacity: preview ? "0.45" : "1",
  });

  // selection bbox
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

  // geometry
  // Leave space for the cathode bar on the right.
  const triScale = 1.45;              // coefficient for the triangle height
  const barX = +w / 2 - barW;        // start of bar zone (right side)
  const xL = -w / 2;                // left edge of diode body zone
  const xR = barX + 1;                  // triangle tip sits on the ba
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

  // cathode bar: draw as a stroke (cleaner than a filled rect)
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

  if (preview) g.setAttribute("pointer-events", "none");
  return g;
}