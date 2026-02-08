# Circuit Simulator – Project Overview & Architecture

## Purpose
An educational, browser-based **circuit drawing and simulation tool** for GCSE / A-level physics.

Primary goals:
- Allow students to **draw circuits** by snapping components to a grid
- Later simulate DC circuits (cells, resistors, capacitors)
- Visualise charge flow, voltages, currents, and time behaviour
- Emphasis on **topology over appearance** (series/parallel reducible circuits only)

Current focus: **UI-first circuit editor**, not simulation yet.

---

## High-Level Architecture

The project is split into **four conceptual layers**:

1. **Editor / Model**
   - Components, instances, ports, topology
2. **Renderer**
   - SVG-based schematic drawing
3. **Interaction / Tools**
   - Placement, rotation, selection (selection not yet implemented)
4. **App / Glue**
   - UI wiring, event handling, state coordination

---

## Core Concepts

### Grid & Coordinates
- Uses a fixed **world coordinate system** (SVG viewBox: `1200 × 800`)
- Grid spacing: `25` units
- Zoom (future) will scale view only — **grid spacing stays constant**
- All components snap to grid intersections

---

## Component System (Key Design Decision)

### ComponentType (registry-driven)
Each component type (e.g. resistor) implements a `ComponentType` interface:

Responsibilities:
- Define **symbol geometry** (single source of truth)
- Define **ports** (relative offsets)
- Define **bounding box**
- Render itself via the renderer
- Convert ports → world positions

Example responsibilities:
- `symbolSpec()` → geometry (body size, lead length)
- `ports()` → logical connection points
- `render(view, inst, opts)` → delegates drawing to renderer
- `portWorldPositions(inst)` → used for topology & debug

⚠️ Renderer **does not know what a resistor is** — it only draws symbols from specs.

---

## Symbol Rendering

### SymbolSpec
Rendering is driven by a `SymbolSpec` returned by a component type.

Currently supported:
- `kind: "rectResistor"`

Renderer flow:
1. ComponentType provides `symbolSpec()`
2. Renderer dispatches based on `spec.kind`
3. Shape-specific builder creates SVG `<g>`

Renderer public API:
- `drawComponentSymbol(inst, spec, opts)`
- No resistor-specific draw functions exist anymore

---

## SchematicSvg (Renderer)

Responsibilities:
- Draw grid
- Draw components from symbol specs
- Manage SVG layers:
  - `mainG` → placed components
  - `debugG` → port dots / labels
  - `previewG` → ghost preview during placement

Renderer is **stateless** with respect to components.

---

## Editor State

### ComponentInstance
Represents a placed component:
- `id`
- `typeId`
- `pos` (grid-aligned world position)
- `rotation` (0/90/180/270)
- `params` (e.g. R, C values)

Stored in:
- `EditorState.components: ComponentInstance[]`

No topology graph yet — ports are visual/debug only (for now).

---

## Tools & Interaction (Current)

### Place Component Tool
- Generic placement tool (not resistor-specific)
- UI:
  - Button: toggle place mode
  - Dropdown: select active component type
- Ghost preview follows mouse when tool active
- `R` rotates preview by 90°
- Right-click cancels placement (returns to idle)
- Left-click places component

### Debug Mode
- Toggle with `D`
- Shows port dots + labels
- Also shows preview ports when placing

---

## App Layer (`app.ts`)
Responsibilities:
- Build temporary toolbar UI
- Wire mouse + keyboard events
- Maintain tool state:
  - place mode
  - active component type
  - preview rotation
  - debug on/off
- Coordinate between EditorState and Renderer

App logic never draws directly — it always goes through:

ComponentType.render(view, instance, opts)


---

## File Structure (Important)

src/
├─ app/
│ └─ app.ts # UI + event wiring
│
├─ editor/
│ ├─ grid.ts # Grid snapping
│ ├─ state.ts # EditorState
│ ├─ types.ts # ComponentInstance, ports, etc.
│ ├─ componentType.ts # ComponentType interface + SymbolSpec
│ ├─ registry.ts # Component type registry
│ └─ componentTypes/
│ └─ resistorType.ts # Resistor implementation
│
├─ render/
│ └─ schematicSvg.ts # SVG renderer
│
└─ editor/snapping.ts # Client → SVG coordinate mapping


---

## Current Status (End of Session)
✔ Generic component placement system  
✔ Grid-aligned ports and symbols  
✔ Single source of truth for geometry  
✔ SVG renderer decoupled from component logic  
✔ Debug port visualisation  
✔ GitHub Pages deployment via Vite + Actions  

---

## Planned Next Steps
- Selection tool (click component → select)
- Move / drag components
- Wires + node graph (topology)
- Simulation layer (DC first)
- Capacitors + time-domain behaviour
- Optional topology reinterpretation (DLC feature)

---

## Important Design Constraints
- Series/parallel reducible circuits only
- No arbitrary mesh solving needed
- Topology matters more than visual layout
- Educational clarity > electrical completeness