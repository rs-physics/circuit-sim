# Circuit Simulator (GCSE/A-level) — Plan + Project Structure

## Goals

Build a browser-based circuit simulator for GCSE/A-level that prioritises **topology (connectivity)** over drawing geometry.

* **V1:** schematic editor (grid snap), no simulation
* **Feature-complete:** DC + RC simulation, probes, scope, charge animation
* **DLC:** auto “reinterpret/flatten” (series/parallel reducible circuits only)
* **Optional DLC:** AC later (nice-to-have, not designed-in heavily)

---

## Core principles

### 1) Separation of concerns

Keep three layers cleanly separated:

1. **Editor/UI** — user actions (place/rotate/select/wire), snapping, tools
2. **Model/Topology** — nodes, pins, components, connectivity (electrical truth)
3. **Simulation** — netlist extraction + solver (DC MNA, RC transient)

### 2) Topology is the circuit

* Nodes are **vertices** (electrically equal potential)
* Components connect nodes via pins
* Wires in the editor exist to **merge/connect nodes**
* Geometry (angles, diagonals) is **visual**, not electrical

### 3) Junction rules

* A node exists when:

  * a **component pin** needs one, or
  * a **wire endpoint** snaps somewhere, or
  * a junction is explicitly placed (optional UI)
* **Crossing lines do not connect** unless there is an explicit snapped node/junction.

### 4) Rendering strategy

* **SVG** for schematic editor (symbols, wires, selection, crisp export)
* **Canvas overlay** later for high-FPS dynamic visuals (charge dots, scope traces if desired)

---

## Milestones

### V1 — Editor only (no solver)

**Outcome:** students can draw circuits neatly and export.

* Grid snapping + Manhattan wiring (horizontal/vertical)
* Place components (cell, resistor, capacitor symbols), rotate 90°
* Wire tool + selection tool + delete/move
* Save/load circuit (JSON)
* Export schematic (PNG +/or SVG)

### V2 — DC simulation + probes

* Build netlist from topology
* DC solve (Modified Nodal Analysis)
* Voltage probes (node or differential), current probes (component branch)
* Basic readout panel

### V3 — RC transient + oscilloscope

* Time stepping with capacitor companion model (e.g., Backward Euler)
* Scope probe: record V(t) / I(t)
* Run/pause/reset, dt control

### V4 — Charge animation overlay

* Use solved branch currents to animate particles along wires
* Split/merge behaviour at junctions based on current ratios

### DLC — Reinterpret/Flatten (series-parallel reducible only)

* Produce series/parallel decomposition tree
* Auto layout into left-to-right “high → low” schematic
* (Pedagogically optional: keep as DLC so students still practise recognition)

---

## Repository and deployment model

* **Separate repo per simulation**, hosted via GitHub Pages
* Main site (`rs-physics.github.io`) links to each sim
* Example URL pattern:

  * `https://rs-physics.github.io/circuit-sim/`

### Vite “base” gotcha

Project pages are served under `/<repo-name>/`.
Vite must be configured so built asset URLs include that base path.

* In `vite.config.ts`: `base: "/circuit-sim/"`

---

## Project structure

### V1 structure (start here)

Keep only what’s needed immediately.

```
src/
├─ main.ts
├─ app/
│  └─ app.ts
├─ model/
│  ├─ node.ts
│  ├─ component.ts
│  └─ circuit.ts
├─ editor/
│  ├─ grid.ts
│  ├─ snapping.ts
│  └─ tools/
│     ├─ selectTool.ts
│     ├─ wireTool.ts
│     └─ placeTool.ts
└─ render/
   ├─ schematicSvg.ts
   └─ viewport.ts
```

### Full target structure (evolves into this)

Add folders/modules as milestones unlock them.

```
src/
├─ main.ts
├─ app/
│  ├─ app.ts
│  └─ state.ts
├─ model/
│  ├─ circuit.ts
│  ├─ node.ts
│  ├─ pin.ts
│  ├─ component.ts
│  ├─ wire.ts
│  └─ serialize.ts
├─ editor/
│  ├─ snapping.ts
│  ├─ hitTest.ts
│  ├─ commands.ts           // undo/redo
│  └─ tools/
│     ├─ selectTool.ts
│     ├─ wireTool.ts
│     ├─ placeTool.ts
│     └─ probeTool.ts
├─ render/
│  ├─ viewport.ts
│  ├─ schematicSvg.ts
│  ├─ symbols.ts
│  └─ overlayCanvas.ts      // V4 particles
├─ sim/
│  ├─ netlist.ts
│  ├─ mna.ts                // DC
│  ├─ transient.ts          // RC
│  ├─ probes.ts
│  └─ scope.ts
├─ layout/                   // DLC
│  ├─ seriesParallelTree.ts
│  └─ flattenLayout.ts
└─ util/
   ├─ geom.ts
   ├─ ids.ts
   └─ math.ts
```

---

## Design constraints (locked decisions)

* **Grid-first** wiring (Manhattan) for V1
* Diagonal wires may be added later as a UI-only feature
* DLC flattening limited to **series/parallel reducible circuits**
* SVG editor + canvas overlay later
