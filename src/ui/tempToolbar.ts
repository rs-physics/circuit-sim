// src/ui/tempToolbar.ts

/**
 * Minimal shape needed by the toolbar for component selection.
 * We intentionally keep this lightweight so the UI layer
 * does not depend on full ComponentType.
 */
export type ToolbarComponentType = {
  typeId: string;
  displayName: string;
};

/**
 * createTempToolbar
 *
 * V1 throwaway UI layer.
 *
 * Responsibilities:
 * - Create a simple top toolbar
 * - Provide buttons for:
 *     - Place mode toggle
 *     - Component type selection
 *     - Wire mode toggle
 * - Create and return the canvas host container
 *
 * This is intentionally dumb and state-free.
 * All real state lives in App / editor logic.
 */
export function createTempToolbar(
  host: HTMLDivElement,
  availableTypes: ToolbarComponentType[]
) {
  // ===========================================================================
  // Toolbar container
  // ===========================================================================

  const toolbar = document.createElement("div");
  toolbar.style.display = "flex";
  toolbar.style.gap = "8px";
  toolbar.style.padding = "8px";
  toolbar.style.borderBottom = "1px solid #ddd";
  toolbar.style.fontFamily = "system-ui, sans-serif";

  // ===========================================================================
  // Buttons + Select
  // ===========================================================================

  // --- Place Component button ---
  const btnPlaceComponent = document.createElement("button");
  btnPlaceComponent.style.padding = "6px 10px";
  toolbar.appendChild(btnPlaceComponent);

  // --- Component type dropdown ---
  const selComponentType = document.createElement("select");
  selComponentType.style.padding = "6px 10px";
  toolbar.appendChild(selComponentType);

  // --- Wire toggle button ---
  const btnWire = document.createElement("button");
  btnWire.style.padding = "6px 10px";
  toolbar.appendChild(btnWire);

  // ===========================================================================
  // Canvas host
  // ===========================================================================

  /**
   * This is where SchematicSvg mounts.
   *
   * Height subtracts toolbar height (roughly 42px).
   * This is crude but good enough for V1.
   */
  const canvasHost = document.createElement("div");
  canvasHost.style.height = "calc(100vh - 42px)";
  canvasHost.style.width = "100%";

  // Attach everything to the root host.
  host.appendChild(toolbar);
  host.appendChild(canvasHost);

  // ===========================================================================
  // Populate component dropdown
  // ===========================================================================

  for (const t of availableTypes) {
    const opt = document.createElement("option");
    opt.value = t.typeId;
    opt.textContent = t.displayName;
    selComponentType.appendChild(opt);
  }

  // ===========================================================================
  // Label helpers (UI-only, no state logic)
  // ===========================================================================

  /**
   * Update wire button label.
   * App is responsible for calling this whenever wire mode changes.
   */
  const setWireLabel = (enabled: boolean) => {
    btnWire.textContent = enabled ? "Wire: ON" : "Wire: OFF";
  };

  /**
   * Update place button label.
   * If enabled, optionally show the active component name.
   */
  const setPlaceLabel = (enabled: boolean, typeDisplayName?: string) => {
    if (!enabled) {
      btnPlaceComponent.textContent = "Place Component: OFF";
    } else {
      btnPlaceComponent.textContent =
        `Place Component: ON (${typeDisplayName ?? "?"})`;
    }
  };

  // ===========================================================================
  // Public API returned to App
  // ===========================================================================

  return {
    canvasHost,
    btnPlaceComponent,
    selComponentType,
    btnWire,
    setWireLabel,
    setPlaceLabel,
  };
}