export type Camera = {
  x: number;
  y: number;
  width: number;
  height: number;
};

type PanState = {
  // Pointer position at pan start (screen/client space)
  startClient: { x: number; y: number };

  // Camera state at pan start (world space)
  startCam: Camera;

  // True once the pointer has moved enough to count as a "drag"
  // (used to distinguish click vs drag)
  moved: boolean;

  // Pointer capture id used during pan
  pointerId: number;
};

/**
 * Camera controller for an SVG viewBox.
 *
 * Responsibilities:
 * - clamp camera to world bounds
 * - pan via pointer drag (screen space -> world space conversion)
 * - zoom around a world point (usually the mouse cursor)
 *
 * This controller does NOT render. It only updates internal camera state.
 */
export function createCameraController(svg: SVGSVGElement, world: Camera) {
  // Current camera view (world space)
  let camera: Camera = { ...world };

  // Active pan drag state, or null if not panning
  let panDrag: PanState | null = null;

  /**
   * Clamp a candidate camera so it stays inside the world bounds.
   * Also prevents zooming out beyond world size.
   */
  const clamp = (c: Camera): Camera => {
    const w = Math.min(c.width, world.width);
    const h = Math.min(c.height, world.height);

    return {
      x: Math.max(world.x, Math.min(c.x, world.x + world.width - w)),
      y: Math.max(world.y, Math.min(c.y, world.y + world.height - h)),
      width: w,
      height: h,
    };
  };

  return {
    /** Read-only snapshot of current camera state */
    getCamera: (): Camera => camera,

    /** True while we have an active pan drag */
    isPanning: (): boolean => panDrag !== null,

    /**
     * True if the current pan drag has exceeded the movement threshold.
     * Used so a "click" doesn't count as a "drag".
     */
    panMoved: (): boolean => !!panDrag?.moved,

    /**
     * Begin a pan drag. Uses pointer capture so we still receive move/up
     * events even if the pointer leaves the SVG bounds.
     */
    startPan(e: PointerEvent) {
      panDrag = {
        startClient: { x: e.clientX, y: e.clientY },
        startCam: { ...camera },
        moved: false,
        pointerId: e.pointerId,
      };

      svg.setPointerCapture(e.pointerId);
    },

    /**
     * Update camera position during a pan drag.
     * Converts client pixel deltas into world-space deltas based on viewBox size.
     */
    updatePan(e: PointerEvent) {
      if (!panDrag) return;

      const dx = e.clientX - panDrag.startClient.x;
      const dy = e.clientY - panDrag.startClient.y;

      // Small deadzone so a click doesn't accidentally become a drag
      if (Math.abs(dx) + Math.abs(dy) > 3) {
        panDrag.moved = true;
      }

      // If we haven't moved enough yet, do nothing
      if (!panDrag.moved) return;

      const rect = svg.getBoundingClientRect();

      // How many world units correspond to one screen pixel?
      const worldPerPxX = panDrag.startCam.width / rect.width;
      const worldPerPxY = panDrag.startCam.height / rect.height;

      // Dragging right should move camera left (hence the minus)
      camera = clamp({
        x: panDrag.startCam.x - dx * worldPerPxX,
        y: panDrag.startCam.y - dy * worldPerPxY,
        width: panDrag.startCam.width,
        height: panDrag.startCam.height,
      });
    },

    /**
     * Zoom around a given world point (usually the mouse cursor).
     * Keeps the cursor "anchored" by preserving its relative position in the viewBox.
     */
    zoomAt(worldPoint: { x: number; y: number }, factor: number) {
      const vb = camera;

      // Cursor position as fraction within current viewBox
      const rx = (worldPoint.x - vb.x) / vb.width;
      const ry = (worldPoint.y - vb.y) / vb.height;

      const newW = vb.width * factor;
      const newH = vb.height * factor;

      // Choose new origin so worldPoint stays under the cursor
      const newX = worldPoint.x - rx * newW;
      const newY = worldPoint.y - ry * newH;

      camera = clamp({
        x: newX,
        y: newY,
        width: newW,
        height: newH,
      });
    },

    /**
     * End the pan drag and release pointer capture.
     * Safe to call even if we aren't panning.
     */
    endPan() {
      if (!panDrag) return;

      try {
        svg.releasePointerCapture(panDrag.pointerId);
      } catch {
        // releasePointerCapture can throw if capture isn't held; safe to ignore
      }

      panDrag = null;
    },
  };
}
