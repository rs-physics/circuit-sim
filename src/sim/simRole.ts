import type { ComponentInstance } from "../editor/types";
import type { ComponentType } from "../editor/componentType";

/**
 * sim/simRole.ts
 *
 * Describes the electrical role a component plays in simulation.
 *
 * ComponentType.simRole() returns one of these.
 * The MNA solver uses it to decide how to stamp the component into the matrix.
 *
 * Components that don't implement simRole() are treated as unsupported —
 * the solver will report them to the UI rather than silently ignoring them.
 *
 * Growth path:
 *  v2a: resistor, voltageSource, wire, openSwitch, closedSwitch
 *  v2b: ammeter, voltmeter, diode, bulb (non-linear resistor, handled as
 *       kind "resistor" with R updated each Newton-Raphson iteration)
 *  v2c: capacitor (DC steady state = open circuit)
 */
export type SimRole =
/**
 * Ideal resistor.
 * R is in ohms. Must be > 0.
 */
    | { kind: "resistor"; R: number }
    /**
     * Ideal voltage source (e.g. cell / battery).
     * V is in volts. Polarity: port "+" is the positive terminal.
     */
    | { kind: "voltageSource"; V: number }
    /**
     * Ideal ammeter.
     * Treated as a 0V voltage source in MNA.
     * The branch current variable IS the ammeter reading.
     */
    | { kind: "ammeter" }
    /**
     * Ideal voltmeter.
     * Treated as an open circuit (infinite resistance).
     * Reads the voltage difference between its two nodes.
     */
    | { kind: "voltmeter" }
    /**
     * Plain wire / short circuit.
     * Used for wire branches in the graph (no component).
     * Also used for closed switch.
     */
    | { kind: "wire" }
    /**
     * Open switch — break in circuit.
     * Treated as an open circuit (removed branch).
     */
    | { kind: "openSwitch" }
    /**
     * Closed switch — short circuit.
     * Treated identically to a wire.
     */
    | { kind: "closedSwitch" }
    /**
     * Capacitor in DC steady state.
     * Treated as an open circuit.
     * v2c only.
     */
    | { kind: "capacitor" };

/**
 * Resolve a component instance's SimRole, given its ComponentType.
 *
 * This is the single place simRole() actually gets called from during
 * graph building — downstream consumers (MNA, animation, etc.) just read
 * the resolved SimRole off the branch rather than needing a getType
 * lookup of their own.
 *
 * Returns null if the component doesn't implement simRole() at all
 * (e.g. a component type that's drawable but not yet simulated, like
 * a diode in v2a). Callers should treat null as "unsupported — flag
 * to the user" rather than silently skipping it.
 */
export function resolveSimRole(
    inst: ComponentInstance,
    type: ComponentType
): SimRole | null {
    if (!type.simRole) return null;
    return type.simRole(inst);
}