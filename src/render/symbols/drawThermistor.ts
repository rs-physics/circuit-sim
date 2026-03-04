import type { Point } from "../../editor/grid";
import type { ThermistorSpec } from "../../editor/componentType";
import type { SymbolDrawFlags } from "./types";
import { svgEl } from "../svgEl";

export function buildThermistorGroup(
  center: Point,
  rotationDeg: number,
  spec: ThermistorSpec,
  flags: SymbolDrawFlags
): SVGGElement {
  const { preview, selected } = flags;

  const w = spec.bodyW;
  const h = spec.bodyH;
  const lead = spec.lead;
  const pad = spec.slashPad;

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

  // thermistor diagonal slash (no arrow head)
  // Common schematic look: a slash across the resistor body.
  const x1 = -w / 2 - pad;
  const y1 = +h / 2 + pad * 0.6;
  const x2 = +w / 2 + pad;
  const y2 = -h / 2 - pad * 0.6;

  g.appendChild(
    svgEl("line", {
      x1: `${x1 + pad * 1.5}`,
      y1: `${y1}`,
      x2: `${x2}`,
      y2: `${y2}`,
      stroke: "black",
      "stroke-width": "2",
      "stroke-linecap": "round",
    })
  );

  // thermistor bottom horizontal line
  g.appendChild(
    svgEl("line", {
      x1: `${x1}`,
      y1: `${y1}`,
      x2: `${x1 + pad * 1.5}`,
      y2: `${y1}`,
      stroke: "black",
      "stroke-width": "2",
      "stroke-linecap": "round",
    })
  );

  if (preview) g.setAttribute("pointer-events", "none");
  return g;
}