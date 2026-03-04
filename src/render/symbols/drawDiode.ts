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

  // diode triangle (anode on left, pointing right)
  // triangle points: left-mid, right-top, right-bottom (or vice versa)
  const xL = -w / 2;
  const xR = +w / 2 - barW - 2; // leave space for bar
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

  // cathode bar on the right
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

  if (preview) g.setAttribute("pointer-events", "none");
  return g;
}