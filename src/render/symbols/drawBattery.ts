import type { Point } from "../../editor/grid";
import type { BatterySpec } from "../../editor/componentType";
import type { SymbolDrawFlags } from "./types";
import { svgEl } from "../svgEl";

export function buildBatteryGroup(
  center: Point,
  rotationDeg: number,
  spec: BatterySpec,
  flags: SymbolDrawFlags
): SVGGElement {
  const { preview, selected } = flags;

  const lead = spec.lead;
  const gap = spec.plateGap;
  const longH = spec.longPlate;
  const shortH = spec.shortPlate;

  // Plate x positions in local space (centered around 0)
  const xLong = -gap / 2;
  const xShort = +gap / 2;

  // Ports end at +/- (gap/2 + lead)
  const portX = gap / 2 + lead;

  const g = svgEl("g", {
    transform: `translate(${center.x} ${center.y}) rotate(${rotationDeg})`,
    opacity: preview ? "0.45" : "1",
  });

  // Selection highlight box (dashed)
  if (selected && !preview) {
    const halfW = portX;
    const halfH = Math.max(longH / 2, 10);
    const pad = 10;

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

  // Leads: from ports to plates
  g.appendChild(
    svgEl("line", {
      x1: `${-portX}`,
      y1: "0",
      x2: `${xLong}`,
      y2: "0",
      stroke: "black",
      "stroke-width": "2",
      "stroke-linecap": "round",
    })
  );

  g.appendChild(
    svgEl("line", {
      x1: `${xShort}`,
      y1: "0",
      x2: `${portX}`,
      y2: "0",
      stroke: "black",
      "stroke-width": "2",
      "stroke-linecap": "round",
    })
  );

  // Long plate (traditionally positive): vertical line at xLong
  g.appendChild(
    svgEl("line", {
      x1: `${xLong}`,
      y1: `${-longH / 2}`,
      x2: `${xLong}`,
      y2: `${+longH / 2}`,
      stroke: "black",
      "stroke-width": "2",
      "stroke-linecap": "round",
    })
  );

  // Short plate (traditionally negative): vertical line at xShort
  g.appendChild(
    svgEl("line", {
      x1: `${xShort}`,
      y1: `${-shortH / 2}`,
      x2: `${xShort}`,
      y2: `${+shortH / 2}`,
      stroke: "black",
      "stroke-width": "4",
      "stroke-linecap": "round",
    })
  );

  // Preview should never block pointer events
  if (preview) g.setAttribute("pointer-events", "none");

  return g;
}
