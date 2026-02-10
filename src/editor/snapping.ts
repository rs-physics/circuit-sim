import type { Point } from "./grid";

/**
 * Convert a browser client-space point (e.clientX / e.clientY)
 * into SVG world coordinates.
 *
 * Why this exists:
 * - Mouse events give us screen-space coordinates.
 * - Our SVG may be zoomed and panned via viewBox.
 * - We must transform into SVG coordinate space before:
 *     - snapping to grid
 *     - hit testing
 *     - placing components
 *
 * This function uses the SVG's current transformation matrix (CTM)
 * to perform the conversion.
 */
export function clientPointToSvgPoint(
  svg: SVGSVGElement,
  client: Point
): Point {
  // Create a temporary SVG point in screen space
  const pt = svg.createSVGPoint();
  pt.x = client.x;
  pt.y = client.y;

  // Get the matrix that maps SVG → screen
  const ctm = svg.getScreenCTM();
  if (!ctm) {
    // Should never happen unless SVG is detached
    return { x: 0, y: 0 };
  }

  // Invert the matrix to go from screen → SVG world space
  const svgPt = pt.matrixTransform(ctm.inverse());

  return {
    x: svgPt.x,
    y: svgPt.y,
  };
}
