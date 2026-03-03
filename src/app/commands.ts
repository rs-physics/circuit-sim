export type UiMode = "select" | "wire" | string;

const isWireMode = (m: UiMode) => m === "wire";
const isSelectMode = (m: UiMode) => m === "select";
const isPlaceMode = (m: UiMode) => !isSelectMode(m) && !isWireMode(m);

export type CancelCommandDeps = {
  getMode: () => UiMode;
  setMode: (m: UiMode) => void;

  wireStart: () => any; // keep loose to avoid circular imports
  setWireStart: (v: any) => void;
  setWirePreviewEnd: (v: any) => void;

  clearSelection: () => void;
  doRender: () => void;
};

/**
 * Canonical "cancel / right-click" behaviour.
 * Safe to call from:
 * - contextmenu
 * - toolbar buttons
 * - future keyboard shortcuts
 */
export function cancelCommand(deps: CancelCommandDeps) {
  const mode = deps.getMode();

  if (isPlaceMode(mode)) {
    deps.setMode("select");
    deps.doRender();
    return;
  }

  if (isWireMode(mode)) {
    if (deps.wireStart()) {
      deps.setWireStart(null);
      deps.setWirePreviewEnd(null);
      deps.doRender();
      return;
    }

    deps.setMode("select");
    deps.doRender();
    return;
  }

  deps.clearSelection();
  deps.doRender();
}