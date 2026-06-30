import type { CircuitGraph } from "./graph";
import type { SolvedCircuit } from "./mna";

/**
 * sim/simState.ts
 *
 * Holds the latest simulation results, kept deliberately separate from
 * EditorState (which holds the user's *drawn* circuit — components, wires,
 * selection).
 *
 * Why separate:
 * - EditorState is authored data: what the user drew. It can be saved/loaded
 *   and makes sense on its own regardless of whether the circuit is valid.
 * - SimState is derived data: the output of running buildGraph + solveCircuit
 *   against EditorState at a point in time. It's disposable — any edit to
 *   EditorState makes the previous SimState stale.
 *
 * This also sets up cleanly for time-based simulation later (capacitor
 * charge/discharge, current animation, V-t graphing): SimState is the
 * natural place to eventually add simTime, running/paused, and a history
 * buffer of past samples — none of which belongs on EditorState.
 */
export interface SimState {
    graph: CircuitGraph | null;
    solved: SolvedCircuit | null;
}

export function createEmptySimState(): SimState {
    return { graph: null, solved: null };
}