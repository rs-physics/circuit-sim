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

export function createCameraController(
  svg: SVGSVGElement,
  world: Camera
) {
  console.log("USING editor/camera.ts createCameraController");
  let camera: Camera = { ...world };
  let panDrag: PanState | null = null;

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
    getCamera: () => camera,

    isPanning: () => panDrag !== null,

    panMoved: () => !!panDrag?.moved,   // ✅ THIS IS THE ONE

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

      if (Math.abs(dx) + Math.abs(dy) > 3) {
        panDrag.moved = true;
      }

      if (!panDrag.moved) return;

      const rect = svg.getBoundingClientRect();
      const worldPerPxX = panDrag.startCam.width / rect.width;
      const worldPerPxY = panDrag.startCam.height / rect.height;

      camera = clamp({
        x: panDrag.startCam.x - dx * worldPerPxX,
        y: panDrag.startCam.y - dy * worldPerPxY,
        width: panDrag.startCam.width,
        height: panDrag.startCam.height,
      });
    },

    zoomAt(worldPoint: { x: number; y: number }, factor: number) {
      const vb = camera;

      // cursor position as fraction inside camera
      const rx = (worldPoint.x - vb.x) / vb.width;
      const ry = (worldPoint.y - vb.y) / vb.height;

      const newW = vb.width * factor;
      const newH = vb.height * factor;

      const newX = worldPoint.x - rx * newW;
      const newY = worldPoint.y - ry * newH;

      camera = clamp({
        x: newX,
        y: newY,
        width: newW,
        height: newH,
      });
    },


    endPan() {
      if (!panDrag) return;
      try { svg.releasePointerCapture(panDrag.pointerId); } catch {}
      panDrag = null;
    },
  };
}
