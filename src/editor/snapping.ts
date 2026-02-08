import type { Point } from "./grid";

export function clientPointToSvgPoint(svg: SVGSVGElement, client: Point): Point {
  const pt = svg.createSVGPoint();
  pt.x = client.x;
  pt.y = client.y;

  const ctm = svg.getScreenCTM();
  if (!ctm) return { x: 0, y: 0 };

  const svgPt = pt.matrixTransform(ctm.inverse());
  return { x: svgPt.x, y: svgPt.y };
}