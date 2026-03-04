import { getIconSvg, type IconKind } from "./icons";

export type ToolbarComponentType = {
  typeId: string;
  displayName: string;
};

export type UiTool = "select" | "wire";

type PaletteItem = {
  typeId: string;
  displayName: string;
  icon: IconKind;
};

// Keep palette typeIds as a union (from this file’s palette)
export type UiComponentMode = PaletteItem["typeId"];
export type UiMode = UiTool | UiComponentMode;

export type TempToolbar = {
  canvasHost: HTMLDivElement;

  // tool buttons (so App can keep using addEventListener)
  btnWire: HTMLButtonElement;
  btnSelect: HTMLButtonElement;

  // action buttons
  btnRotate: HTMLButtonElement;
  btnExportPng: HTMLButtonElement;
  btnCopyPng: HTMLButtonElement;

  // single source of truth
  getMode: () => UiMode;
  setMode: (mode: UiMode) => void;
  onModeChange: (fn: (mode: UiMode) => void) => void;

  // Toast messages
  showToast: (msg: string) => void;

  // convenience (optional, but keeps App changes small)
  getActiveComponentTypeId: () => string | null;
};

export function createTempToolbar(
  host: HTMLDivElement,
  availableTypes: ToolbarComponentType[],  actions: {
    exportPng: () => void | Promise<void>;
    copyPng: () => void | Promise<void>;
  }
): TempToolbar {
  const root = document.createElement("div");
  root.className = "ui-root";

  const toolbar = document.createElement("div");
  toolbar.className = "ui-toolbar ui-panel";

  // -----------------------------
  // Toast (small in-app notification)
  // -----------------------------
  const toast = document.createElement("div");
  toast.className = "ui-toast";
  toast.dataset.visible = "false";
  root.appendChild(toast);

  let toastTimer: number | null = null;

  const showToast = (msg: string) => {
    toast.textContent = msg;
    toast.dataset.visible = "true";

    if (toastTimer !== null) window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(() => {
      toast.dataset.visible = "false";
      toastTimer = null;
    }, 1500);
  };

  // -----------------------------
  // Components palette definition
  // -----------------------------
  const PALETTE: PaletteItem[] = [
    { typeId: "resistor", displayName: "Resistor", icon: "resistor" },
    { typeId: "battery", displayName: "Battery", icon: "battery" },
    { typeId: "capacitor", displayName: "Capacitor", icon: "capacitor" },
    { typeId: "bulb", displayName: "Bulb", icon: "bulb" },

    { typeId: "switch", displayName: "Switch", icon: "switch" },
    { typeId: "varResistor", displayName: "Var. Resistor", icon: "varResistor" },

    { typeId: "ammeter", displayName: "Ammeter", icon: "ammeter" },
    { typeId: "voltmeter", displayName: "Voltmeter", icon: "voltmeter" },
    { typeId: "thermistor", displayName: "Thermistor", icon: "thermistor" },
    { typeId: "ldr", displayName: "LDR", icon: "ldr" },
    { typeId: "diode", displayName: "Diode", icon: "varResistor" },
    { typeId: "led", displayName: "LED", icon: "resistor" },
  ];

  const availableTypeIds = new Set(availableTypes.map((t) => t.typeId));

  // -----------------------------
  // Mode state (single enum)
  // -----------------------------
  // default: first implemented palette item, else resistor

  let mode: UiMode = "select";
  let onMode: ((m: UiMode) => void) | null = null;

  const getMode = () => mode;

  const setMode = (m: UiMode) => {
    mode = m;
    syncUiToMode();
    onMode?.(mode);
  };

  const onModeChange = (fn: (m: UiMode) => void) => {
    onMode = fn;
  };

  const getActiveComponentTypeId = (): string | null => {
    return mode !== "select" && mode !== "wire" ? mode : null;
  };

  // -----------------------------
  // Tools group
  // -----------------------------
  const toolsGroup = document.createElement("div");
  toolsGroup.className = "ui-group";

  const toolsLabel = document.createElement("div");
  toolsLabel.className = "ui-groupLabel";
  toolsLabel.textContent = "Tools";
  toolsGroup.appendChild(toolsLabel);

  const toolGrid = document.createElement("div");
  toolGrid.className = "ui-toolGrid";
  toolsGroup.appendChild(toolGrid);

  const makeToolTile = (label: string, tool: UiTool, iconKind: IconKind) => {
    const wrap = document.createElement("div");
    wrap.className = "ui-toolWrap";

    const title = document.createElement("div");
    title.className = "ui-toolLabel";
    title.textContent = label;

    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "ui-toolTile";
    btn.dataset.tool = tool;
    btn.dataset.selected = "false";
    btn.innerHTML = getIconSvg(iconKind);

    wrap.appendChild(title);
    wrap.appendChild(btn);

    return { wrap, btn, title };
  };

  const selectTool = makeToolTile("Select", "select", "select");
  const wireTool = makeToolTile("Wire", "wire", "wire");

  toolGrid.appendChild(selectTool.wrap);
  toolGrid.appendChild(wireTool.wrap);

  const btnSelect = selectTool.btn;
  const btnWire = wireTool.btn;

  const toolButtons: Record<UiTool, HTMLButtonElement> = {
    select: btnSelect,
    wire: btnWire,
  };

  // (optional) let toolbar drive mode directly
  btnSelect.addEventListener("click", () => setMode("select"));
  btnWire.addEventListener("click", () => setMode("wire"));

  // -----------------------------
  // Components group (palette)
  // -----------------------------
  const compGroup = document.createElement("div");
  compGroup.className = "ui-group";

  const compLabel = document.createElement("div");
  compLabel.className = "ui-groupLabel";
  compLabel.textContent = "Components";
  compGroup.appendChild(compLabel);

  const compScroller = document.createElement("div");
  compScroller.className = "ui-compScroller";
  compGroup.appendChild(compScroller);

  const compGrid = document.createElement("div");
  compGrid.className = "ui-compGrid";
  compScroller.appendChild(compGrid);

  const compButtons = new Map<string, HTMLButtonElement>();

  for (const item of PALETTE) {
    const implemented = availableTypeIds.has(item.typeId);

    const b = document.createElement("button");
    b.type = "button";
    b.className = "ui-compTile";
    b.dataset.typeId = item.typeId;
    b.dataset.selected = "false";
    b.dataset.disabled = implemented ? "false" : "true";

    const icon = document.createElement("div");
    icon.className = "ui-compIcon";
    icon.innerHTML = getIconSvg(item.icon);

    const name = document.createElement("div");
    name.className = "ui-compName";
    name.textContent = item.displayName;

    b.appendChild(icon);
    b.appendChild(name);

    if (implemented) {
      b.addEventListener("click", () => {
        // clicking a component puts you into that component "place" mode
        setMode(item.typeId as UiComponentMode);
      });
    } else {
      b.disabled = true;
    }

    compGrid.appendChild(b);
    compButtons.set(item.typeId, b);
  }

  // -----------------------------
  // Sync UI selection states from mode
  // -----------------------------
  const syncUiToMode = () => {
    // tools: selected only if mode is that tool
    for (const [tool, b] of Object.entries(toolButtons) as [UiTool, HTMLButtonElement][]) {
      b.dataset.selected = mode === tool ? "true" : "false";
    }

    // components: selected only if mode is that component
    for (const [id, b] of compButtons) {
      b.dataset.selected = mode === id ? "true" : "false";
    }
  };

  // -----------------------------
  // Actions group (rotate/export)
  // -----------------------------
  const actionsGroup = document.createElement("div");
  actionsGroup.className = "ui-group";

  const actionsLabel = document.createElement("div");
  actionsLabel.className = "ui-groupLabel";
  actionsLabel.textContent = "Actions";
  actionsGroup.appendChild(actionsLabel);

  const actionsGrid = document.createElement("div");
  actionsGrid.className = "ui-actionsGrid";
  actionsGroup.appendChild(actionsGrid);

  const makeActionTile = (label: string, iconKind: IconKind) => {
    const wrap = document.createElement("div");
    wrap.className = "ui-toolWrap"; // reuse same wrapper styling

    const title = document.createElement("div");
    title.className = "ui-toolLabel"; // reuse same label styling
    title.textContent = label;

    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "ui-toolTile ui-actionTile"; // reuse tool tile styling
    btn.dataset.selected = "false";
    btn.innerHTML = getIconSvg(iconKind);

    wrap.appendChild(title);
    wrap.appendChild(btn);

    return { wrap, btn };
  };

  const rotateAction = makeActionTile("Rotate", "rotate");
  const deleteAction = makeActionTile("Delete", "delete");
  const exportAction = makeActionTile("Export", "export");
  const copyAction = makeActionTile("Copy", "copy");

  actionsGrid.appendChild(rotateAction.wrap);
  actionsGrid.appendChild(deleteAction.wrap);
  actionsGrid.appendChild(exportAction.wrap);
  actionsGrid.appendChild(copyAction.wrap);

  const btnRotate = rotateAction.btn;
  const btnDelete = deleteAction.btn;
  const btnExportPng = exportAction.btn;
  const btnCopyPng = copyAction.btn;

  btnRotate.addEventListener("click", () => {
    window.dispatchEvent(
      new KeyboardEvent("keydown", { key: "r" })
    );
  });

  btnDelete.addEventListener("click", () => {
  window.dispatchEvent(
    new KeyboardEvent("keydown", { key: "delete" })
  );
});

btnExportPng.addEventListener("click", actions.exportPng);
btnCopyPng.addEventListener("click", async () => {
  try {
    console.log("Copy button clicked");
    await actions.copyPng();
    console.log("Circuit copied to clipboard.");
    showToast("Circuit copied to clipboard.");
  } catch (err) {
    console.error("Copy failed:", err);
    showToast("Couldn't copy circuit. Use Export instead.");
  }
});

  // -----------------------------
  // Toolbar layout + host
  // -----------------------------
  const spacer = document.createElement("div");
  spacer.className = "ui-spacer";

  const shortcuts = document.createElement("div");
  shortcuts.className = "ui-shortcuts";

  const shortcutsTitle = document.createElement("div");
  shortcutsTitle.className = "ui-shortcutsTitle";
  shortcutsTitle.textContent = "Keyboard shortcuts";
  shortcuts.appendChild(shortcutsTitle);

  const shortcutsGrid = document.createElement("div");
  shortcutsGrid.className = "ui-shortcutsGrid";
  shortcuts.appendChild(shortcutsGrid);

const addShortcut = (key: string, desc: string) => {
  const item = document.createElement("div");
  item.className = "ui-shortcutItem";

  const k = document.createElement("div");
  k.className = "ui-shortcutKey";
  k.textContent = key;

  const d = document.createElement("div");
  d.className = "ui-shortcutDesc";
  d.textContent = desc;

  item.appendChild(k);
  item.appendChild(d);
  shortcutsGrid.appendChild(item);
};

  addShortcut("w", "Wire mode");
  addShortcut("r", "Rotate");
  addShortcut("Del", "Delete");
  addShortcut("Right-click", "Cancel");
  addShortcut("Middle-click", "Pan")
  addShortcut("Scroll wheel", "Zoom")
  addShortcut("d", "Debug mode");

  spacer.className = "ui-spacer";

  toolbar.appendChild(toolsGroup);
  toolbar.appendChild(compGroup);
  toolbar.appendChild(actionsGroup);
  toolbar.appendChild(spacer);    // keeps any later stuff pushed right
  toolbar.appendChild(shortcuts);

  const canvasHost = document.createElement("div");
  canvasHost.className = "ui-canvasHost ui-panel";

  root.appendChild(toolbar);
  root.appendChild(canvasHost);
  host.appendChild(root);

  // initial states
  // start in select mode
  setMode("select");
  // but if you want to default to a component pre-selected instead, swap to:
  // setMode(defaultComponent as UiComponentMode);

  return {
    canvasHost,
    btnSelect,
    btnWire,
  
    btnRotate,
    btnExportPng,
    btnCopyPng,

    getMode,
    setMode,
    onModeChange,

    getActiveComponentTypeId,

    showToast,
  };
}
