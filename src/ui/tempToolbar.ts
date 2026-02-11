import { getIconSvg, type IconKind } from "./icons";

export type ToolbarComponentType = {
  typeId: string;
  displayName: string;
};

export type TempToolbar = {
  canvasHost: HTMLDivElement;

  // tool buttons (so App can keep using addEventListener)
  btnWire: HTMLButtonElement;
  btnPlaceComponent: HTMLButtonElement;
  btnSelect: HTMLButtonElement;

  // component selection API (replaces <select>)
  getActiveComponentTypeId: () => string;
  setActiveComponentTypeId: (typeId: string) => void;
  onComponentSelect: (fn: (typeId: string) => void) => void;

  setActiveTool: (tool: "select" | "wire" | "place") => void;
};

type PaletteItem = {
  typeId: string;
  displayName: string;
  icon: IconKind;
};

export function createTempToolbar(
  host: HTMLDivElement,
  availableTypes: ToolbarComponentType[]
): TempToolbar {
  const root = document.createElement("div");
  root.className = "ui-root";

  const toolbar = document.createElement("div");
  toolbar.className = "ui-toolbar ui-panel";

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

  const makeToolTile = (label: string, tool: "select" | "wire" | "place", iconKind: IconKind) => {
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
  const placeTool = makeToolTile("Place", "place", "place");

  toolGrid.appendChild(selectTool.wrap);
  toolGrid.appendChild(wireTool.wrap);
  toolGrid.appendChild(placeTool.wrap);

  const btnSelect = selectTool.btn;
  const btnWire = wireTool.btn;
  const btnPlaceComponent = placeTool.btn;

  const toolButtons: Record<"select" | "wire" | "place", HTMLButtonElement> = {
    select: btnSelect,
    wire: btnWire,
    place: btnPlaceComponent,
  };

  const setActiveTool = (tool: "select" | "wire" | "place") => {
    for (const b of Object.values(toolButtons)) b.dataset.selected = "false";
    toolButtons[tool].dataset.selected = "true";
  };

  // -----------------------------
  // Components group (palette)
  // -----------------------------
  const compGroup = document.createElement("div");
  compGroup.className = "ui-group";

  const compLabel = document.createElement("div");
  compLabel.className = "ui-groupLabel";
  compLabel.textContent = "Components";
  compGroup.appendChild(compLabel);

  // scroller container (CSS will make it horizontal)
  const compScroller = document.createElement("div");
  compScroller.className = "ui-compScroller";
  compGroup.appendChild(compScroller);

  const compGrid = document.createElement("div");
  compGrid.className = "ui-compGrid";
  compScroller.appendChild(compGrid);

  // What we WANT to show in the UI (even if not implemented yet)
  const PALETTE: PaletteItem[] = [
    { typeId: "resistor", displayName: "Resistor", icon: "resistor" },
    { typeId: "battery", displayName: "Battery", icon: "battery" },
    { typeId: "capacitor", displayName: "Capacitor", icon: "capacitor" },
    { typeId: "bulb", displayName: "Bulb", icon: "bulb" },
  ];

  // which types are actually implemented/registered
  const availableTypeIds = new Set(availableTypes.map((t) => t.typeId));

  let activeComponentTypeId = availableTypes[0]?.typeId ?? "resistor";
  let onCompSelect: ((typeId: string) => void) | null = null;

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
        setActiveComponentTypeId(item.typeId);
        onCompSelect?.(item.typeId);
      });
    } else {
      b.disabled = true;
    }

    compGrid.appendChild(b);
    compButtons.set(item.typeId, b);
  }

  const setActiveComponentTypeId = (typeId: string) => {
    activeComponentTypeId = typeId;

    for (const [id, b] of compButtons) {
      b.dataset.selected = id === typeId ? "true" : "false";
    }
  };

  const getActiveComponentTypeId = () => activeComponentTypeId;

  // -----------------------------
  // Toolbar layout + host
  // -----------------------------
  const spacer = document.createElement("div");
  spacer.className = "ui-spacer";

  const hint = document.createElement("div");
  hint.className = "ui-hint";
  hint.textContent = "Right-click: cancel/deselect • D: debug • R: rotate • W: wire";

  toolbar.appendChild(toolsGroup);
  toolbar.appendChild(compGroup);
  toolbar.appendChild(spacer);
  toolbar.appendChild(hint);

  const canvasHost = document.createElement("div");
  canvasHost.className = "ui-canvasHost ui-panel";

  root.appendChild(toolbar);
  root.appendChild(canvasHost);
  host.appendChild(root);

  // initial states
  setActiveTool("select");
  setActiveComponentTypeId(activeComponentTypeId);

  return {
    canvasHost,
    btnSelect,
    btnWire,
    btnPlaceComponent,

    getActiveComponentTypeId,
    setActiveComponentTypeId,
    onComponentSelect: (fn) => {
      onCompSelect = fn;
    },

    setActiveTool,
  };
}
