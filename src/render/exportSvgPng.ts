// src/render/exportSvgPng.ts

type ExportOpts = {
  filename?: string;
  padding?: number; // in SVG world units
  scale?: number;   // raster scale (2 = sharper)
};

type PngResult = {
  blob: Blob;
  width: number;  // px
  height: number; // px
};

const SVG_NS = "http://www.w3.org/2000/svg";

function measureContentBBox(svg: SVGSVGElement): DOMRect {
  // We only want the real content. Based on your SchematicSvg layer order:
  // 0 grid, 1 wires, 2 main, 3 debug, 4 preview
  const wiresG = svg.children.item(1) as SVGGElement | null;
  const mainG = svg.children.item(2) as SVGGElement | null;

  if (!wiresG && !mainG) {
    return new DOMRect(0, 0, 0, 0);
  }

  // Create a hidden measuring SVG in the DOM (getBBox is most reliable when attached).
  const tmpSvg = document.createElementNS(SVG_NS, "svg");
  tmpSvg.setAttribute("width", "1");
  tmpSvg.setAttribute("height", "1");
  tmpSvg.style.position = "fixed";
  tmpSvg.style.left = "-10000px";
  tmpSvg.style.top = "-10000px";
  tmpSvg.style.visibility = "hidden";
  tmpSvg.style.pointerEvents = "none";

  const g = document.createElementNS(SVG_NS, "g");

  // Clone only content layers (no grid/debug/preview)
  if (wiresG) g.appendChild(wiresG.cloneNode(true));
  if (mainG) g.appendChild(mainG.cloneNode(true));

  tmpSvg.appendChild(g);
  document.body.appendChild(tmpSvg);

  // If there is literally nothing drawn, getBBox can throw.
  let bbox: DOMRect;
  try {
    const b = (g as unknown as SVGGraphicsElement).getBBox();
    bbox = new DOMRect(b.x, b.y, b.width, b.height);
  } catch {
    bbox = new DOMRect(0, 0, 0, 0);
  } finally {
    tmpSvg.remove();
  }

  return bbox;
}

function serializeSvg(svg: SVGSVGElement): string {
  // Ensure namespaces exist for serialization correctness
  if (!svg.getAttribute("xmlns")) svg.setAttribute("xmlns", SVG_NS);
  if (!svg.getAttribute("xmlns:xlink"))
    svg.setAttribute("xmlns:xlink", "http://www.w3.org/1999/xlink");
  return new XMLSerializer().serializeToString(svg);
}

function blobFromCanvas(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error("toBlob() returned null"))),
      "image/png"
    );
  });
}

/**
 * Core renderer:
 * - clones + strips layers
 * - crops to content bbox (+padding)
 * - rasterizes to a PNG Blob
 *
 * Returns null if nothing is drawn.
 */
export async function renderSvgToPngBlob(
  svg: SVGSVGElement,
  opts: ExportOpts = {}
): Promise<PngResult | null> {
  const padding = opts.padding ?? 24;
  const scale = opts.scale ?? 2;

  const bbox = measureContentBBox(svg);

  // Nothing drawn: bail gracefully
  if (bbox.width <= 0 || bbox.height <= 0) {
    console.warn("renderSvgToPngBlob: nothing to export (empty bbox).");
    return null;
  }

  // Padded crop rect (SVG world units)
  const x = bbox.x - padding;
  const y = bbox.y - padding;
  const w = bbox.width + padding * 2;
  const h = bbox.height + padding * 2;

  // Clone the SVG so we don't mutate live view
  const clone = svg.cloneNode(true) as SVGSVGElement;

  // Remove layers we don't want in the export
  clone.querySelector('[data-layer="grid"]')?.remove();
  clone.querySelector('[data-layer="debug"]')?.remove();
  clone.querySelector('[data-layer="preview"]')?.remove();

  // Crop by viewBox + explicit size (makes raster stable)
  clone.setAttribute("viewBox", `${x} ${y} ${w} ${h}`);
  clone.setAttribute("width", `${w}`);
  clone.setAttribute("height", `${h}`);

  const svgText = serializeSvg(clone);
  const svgBlob = new Blob([svgText], { type: "image/svg+xml;charset=utf-8" });
  const svgUrl = URL.createObjectURL(svgBlob);

  try {
    const img = new Image();
    img.decoding = "async";

    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error("Failed to load SVG blob into Image()"));
      img.src = svgUrl;
    });

    const canvas = document.createElement("canvas");
    const outW = Math.max(1, Math.round(w * scale));
    const outH = Math.max(1, Math.round(h * scale));
    canvas.width = outW;
    canvas.height = outH;

    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("No 2D canvas context");

    // White background (PowerPoint-friendly)
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.setTransform(scale, 0, 0, scale, 0, 0);
    ctx.drawImage(img, 0, 0);

    const pngBlob = await blobFromCanvas(canvas);

    return { blob: pngBlob, width: outW, height: outH };
  } finally {
    URL.revokeObjectURL(svgUrl);
  }
}

/** Delivery helper: download any Blob as a file. */
export function downloadBlob(blob: Blob, filename: string) {
  const a = document.createElement("a");
  const url = URL.createObjectURL(blob);

  a.href = url;
  a.download = filename;

  document.body.appendChild(a);
  a.click();
  a.remove();

  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

export async function copyPngBlobToClipboard(blob: Blob): Promise<void> {
  const ClipboardItemCtor = (window as any).ClipboardItem as
    | (new (items: Record<string, Blob>) => ClipboardItem)
    | undefined;

  if (!navigator.clipboard || typeof navigator.clipboard.write !== "function" || !ClipboardItemCtor) {
    throw new Error("Clipboard image write is not supported in this browser/context.");
  }

  // Use blob.type as the key (Mozilla pattern)
  const item = new ClipboardItemCtor({ [blob.type]: blob });
  await navigator.clipboard.write([item]);
}

export async function copySvgAsPngToClipboard(
  svg: SVGSVGElement,
  opts: ExportOpts = {}
): Promise<void> {
  const result = await renderSvgToPngBlob(svg, opts);
  if (!result) return;

  await copyPngBlobToClipboard(result.blob);
}

export async function exportSvgAsPng(
  svg: SVGSVGElement,
  opts: ExportOpts = {}
): Promise<void> {
  const filename = opts.filename ?? "circuit.png";

  const result = await renderSvgToPngBlob(svg, opts);
  if (!result) return;

  downloadBlob(result.blob, filename);
}