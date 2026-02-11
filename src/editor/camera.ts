export type Camera = {
  x: number;
  y: number;
  width: number;
  height: number;
};

type PanState = {
  startClient: { x: number; y: number };
  startCam: Camera;
  moved: boolean;
  pointerId: number;
};

/**
 * Screen-space camera:
 * - Grid size should remain constant in pixels when the window resizes.
 * - Zoom only changes when user uses the mouse wheel (zoomAt).
 *
 * We model zoom as "world units per screen pixel" (unitsPerPx).
 * If unitsPerPx is constant, then 25 world units always renders as 25 pixels.
 */
export function createCameraController(svg: SVGSVGElement, world: Camera) {
  // Current camera view (world space)
  let camera: Camera = { ...world };

  // Active pan drag state, or null if not panning
  let panDrag: PanState | null = null;

  // Zoom level: how many world units correspond to 1 screen pixel.
  // unitsPerPx = 1 means 1 world unit == 1 pixel (25 grid units = 25 px).
  let unitsPerPx = 1;

  /** Clamp camera to world bounds. */
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

  /** Current SVG pixel size. */
  const getSvgPxSize = () => {
    const rect = svg.getBoundingClientRect();
    return { w: Math.max(1, rect.width), h: Math.max(1, rect.height) };
  };

  /**
   * Recompute camera width/height from current SVG pixel size and current unitsPerPx,
   * keeping the camera centered on the same world point.
   *
   * This is what prevents resize from looking like zoom.
   */
  const applyUnitsPerPx = () => {
    const { w: pxW, h: pxH } = getSvgPxSize();

    const newW = pxW * unitsPerPx;
    const newH = pxH * unitsPerPx;

    const cx = camera.x + camera.width / 2;
    const cy = camera.y + camera.height / 2;

    camera = clamp({
      x: cx - newW / 2,
      y: cy - newH / 2,
      width: newW,
      height: newH,
    });
  };

  /**
   * Update unitsPerPx from the current camera + current SVG pixel size.
   * Call this after zoom changes (because zoom changes camera width/height).
   */
  const updateUnitsPerPxFromCamera = () => {
    const { w: pxW } = getSvgPxSize();
    // width is enough because your viewBox uses the same scale in both axes
    unitsPerPx = camera.width / pxW;
  };

  // Initialize camera dimensions based on current SVG pixels.
  // (Keeps 1 world unit == 1 px at startup, unless you change unitsPerPx.)
  applyUnitsPerPx();

  return {
    /** Camera snapshot */
    getCamera: (): Camera => camera,

    /** True while panning */
    isPanning: (): boolean => panDrag !== null,

    /** True once pan exceeds small threshold */
    panMoved: (): boolean => !!panDrag?.moved,

    setCamera(next: Camera) {
      camera = clamp(next);
      // If external code sets camera, keep zoom tracking consistent.
      updateUnitsPerPxFromCamera();
    },

    /**
     * Call this whenever the SVG pixel size might have changed.
     * Easiest: call on window resize, ideally inside requestAnimationFrame.
     *
     * IMPORTANT:
     * - We do NOT reset camera to 100%.
     * - We keep unitsPerPx constant and recompute width/height from pixel size.
     */
    handleResize() {
      applyUnitsPerPx();
    },

    startPan(e: PointerEvent) {
      panDrag = {
        startClient: { x: e.clientX, y: e.clientY },
        startCam: { ...camera },
        moved: false,
        pointerId: e.pointerId,
      };
      svg.setPointerCapture(e.pointerId);
    },

    updatePan(e: PointerEvent) {
      if (!panDrag) return;

      const dx = e.clientX - panDrag.startClient.x;
      const dy = e.clientY - panDrag.startClient.y;

      if (Math.abs(dx) + Math.abs(dy) > 3) panDrag.moved = true;
      if (!panDrag.moved) return;

      // Convert pixel drag into world drag using current unitsPerPx.
      camera = clamp({
        x: panDrag.startCam.x - dx * unitsPerPx,
        y: panDrag.startCam.y - dy * unitsPerPx,
        width: panDrag.startCam.width,
        height: panDrag.startCam.height,
      });
    },

    /**
     * Zoom at a world point.
     * factor < 1 zooms in, factor > 1 zooms out.
     */
    zoomAt(worldPoint: { x: number; y: number }, factor: number) {
      const prev = camera;

      // Cursor position as fraction within current viewBox
      const rx = (worldPoint.x - prev.x) / prev.width;
      const ry = (worldPoint.y - prev.y) / prev.height;

      const desiredW = prev.width * factor;
      const desiredH = prev.height * factor;

      const desiredX = worldPoint.x - rx * desiredW;
      const desiredY = worldPoint.y - ry * desiredH;

      const next = clamp({
        x: desiredX,
        y: desiredY,
        width: desiredW,
        height: desiredH,
      });

      // If clamping means “no actual change”, don’t update anything else.
      const unchanged =
        next.x === prev.x &&
        next.y === prev.y &&
        next.width === prev.width &&
        next.height === prev.height;

      if (unchanged) return;

      camera = next;

      // IMPORTANT:
      // Record the new zoom level so future resizes preserve it.
      updateUnitsPerPxFromCamera();
    },

    endPan() {
      if (!panDrag) return;
      try {
        svg.releasePointerCapture(panDrag.pointerId);
      } catch {}
      panDrag = null;
    },
  };
}
