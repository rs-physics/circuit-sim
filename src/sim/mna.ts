import type { CircuitGraph } from "./graph";

/**
 * sim/mna.ts (stage 1 of 2)
 *
 * Stage 1: build the matrix A and right-hand side vector z from the graph.
 * No solving yet — just stamping, so the matrix can be inspected and sanity
 * checked against a known circuit before trusting a solver.
 *
 * --- Node numbering ---
 * Arbitrary for now: graph.nodes[0] = N0 (ground), excluded from unknowns.
 * Every other node gets an index 0..(numNodeUnknowns-1) in the matrix.
 * ("Relabel by ascending potential after solving" comes later — that step
 * needs real voltages to relabel by, so it belongs after stage 2.)
 *
 * --- Unknowns vector x (implied by matrix size, built in stage 2) ---
 * Indices 0..(numNodeUnknowns-1):              node voltages (N1, N2, ...)
 * Indices numNodeUnknowns..(end):               voltage source branch currents
 *
 * --- Stamping rules ---
 * Resistor (R) between node A and node B:
 *   conductance g = 1/R
 *   A[a][a] += g      A[b][b] += g
 *   A[a][b] -= g      A[b][a] -= g
 *   (this is just KCL: current out of a node via this resistor
 *   depends on the voltage difference between its two nodes)
 *
 * Voltage source (V) between node A (+) and node B (-):
 *   adds one new unknown: the current through the source, call it row k
 *   A[a][k] += 1      A[k][a] += 1
 *   A[b][k] -= 1      A[k][b] -= 1
 *   z[k] = V
 *   (this is KVL: forces V_A - V_B = V, regardless of current)
 *
 * Ground node (N0): excluded entirely — it never gets a row/column.
 * Any branch touching ground simply doesn't stamp the ground side.
 *
 * Ammeter: treated as a voltage source with V = 0 (same stamp as above,
 * just with z[k] = 0). Its solved current unknown IS the ammeter reading.
 */

export interface MNASystem {
    A: number[][];
    z: number[];
    nodeIndex: Map<string, number>;    // nodeId -> row/col index (ground excluded)
    groundNodeId: string;
    sourceIndex: Map<string, number>;  // componentId -> row/col index for its current unknown
    size: number;
}

export function buildMNASystem(graph: CircuitGraph): MNASystem {
    // --- Node numbering (arbitrary N0 for now) ---
    const groundNodeId = graph.nodes[0]?.id;

    const nodeIndex = new Map<string, number>();
    let nextNodeIdx = 0;
    for (const node of graph.nodes) {
        if (node.id === groundNodeId) continue;
        nodeIndex.set(node.id, nextNodeIdx);
        nextNodeIdx++;
    }
    const numNodeUnknowns = nextNodeIdx;

    // --- Find voltage sources first, to know how many extra rows/cols we need ---
    // An ammeter is treated as a 0V voltage source (the standard MNA trick),
    // so it needs the same current-unknown treatment as a real source.
    const sourceBranches = graph.branches.filter(
        (b) => b.role?.kind === "voltageSource" || b.role?.kind === "ammeter"
    );

    const sourceIndex = new Map<string, number>();
    sourceBranches.forEach((b, i) => {
        sourceIndex.set(b.componentId, numNodeUnknowns + i);
    });

    const size = numNodeUnknowns + sourceBranches.length;

    const A: number[][] = Array.from({ length: size }, () => Array(size).fill(0));
    const z: number[] = Array(size).fill(0);

    // Helper: get a branch's two endpoint indices, or -1 if that side is ground.
    function nodeRow(nodeId: string): number {
        return nodeIndex.has(nodeId) ? nodeIndex.get(nodeId)! : -1; // -1 = ground
    }

    // --- Stamp every branch ---
    for (const branch of graph.branches) {
        if (!branch.role) {
            console.warn(`Skipping branch ${branch.componentId}: no SimRole (unsupported component)`);
            continue;
        }

        const a = nodeRow(branch.nodeAId);
        const b = nodeRow(branch.nodeBId);

        if (branch.role.kind === "resistor") {
            stampResistor(A, a, b, branch.role.R);
        } else if (branch.role.kind === "voltageSource") {
            const k = sourceIndex.get(branch.componentId)!;
            stampVoltageSource(A, z, a, b, k, branch.role.V);
        } else if (branch.role.kind === "ammeter") {
            // Ideal ammeter = 0V source. Same stamp as a voltage source, V=0.
            // Its current unknown (x[k] after solving) IS the ammeter reading.
            const k = sourceIndex.get(branch.componentId)!;
            stampVoltageSource(A, z, a, b, k, 0);
        } else {
            console.warn(`Skipping branch ${branch.componentId}: role "${branch.role.kind}" not stamped yet`);
        }
    }

/*    console.log("--- buildMNASystem: matrix A ---");
    console.table(A);
    console.log("--- buildMNASystem: vector z ---", z);
    console.log("--- buildMNASystem: nodeIndex ---", nodeIndex);
    console.log("--- buildMNASystem: groundNodeId ---", groundNodeId);
    console.log("--- buildMNASystem: sourceIndex ---", sourceIndex);*/

    return { A, z, nodeIndex, groundNodeId, sourceIndex, size };
}

/**
 * Stamp a resistor between node indices a and b (-1 = ground, not stamped).
 */
function stampResistor(A: number[][], a: number, b: number, R: number) {
    const g = 1 / R;

    if (a !== -1) A[a][a] += g;
    if (b !== -1) A[b][b] += g;
    if (a !== -1 && b !== -1) {
        A[a][b] -= g;
        A[b][a] -= g;
    }
}

/**
 * Stamp a voltage source between node indices a (+) and b (-), with its
 * current unknown living at row/col k.
 */
function stampVoltageSource(
    A: number[][],
    z: number[],
    a: number,
    b: number,
    k: number,
    V: number
) {
    if (a !== -1) {
        A[a][k] += 1;
        A[k][a] += 1;
    }
    if (b !== -1) {
        A[b][k] -= 1;
        A[k][b] -= 1;
    }
    z[k] = V;
}

/**
 * sim/mna.ts (stage 2 of 2)
 *
 * Solve Ax = z using Gaussian elimination with partial pivoting.
 *
 * "Partial pivoting" means: before eliminating each column, we look down
 * that column and swap rows so the largest available value sits on the
 * diagonal first. This isn't just tidiness — dividing by a small or zero
 * pivot is where naive Gaussian elimination falls apart numerically
 * (huge rounding error, or an outright divide-by-zero crash even when
 * the system genuinely has a valid solution). Swapping rows first avoids
 * both problems.
 *
 * This mutates copies of A and z, not the originals, so the matrix you
 * already logged and inspected stays untouched for debugging.
 */
function solveLinearSystem(Ain: number[][], zin: number[]): number[] | null {
    const n = zin.length;

    // Work on copies so the original A/z (already logged) aren't mutated.
    const A = Ain.map((row) => [...row]);
    const z = [...zin];

    for (let col = 0; col < n; col++) {
        // --- Partial pivoting: find the row with the largest value in this column ---
        let pivotRow = col;
        let maxVal = Math.abs(A[col][col]);
        for (let row = col + 1; row < n; row++) {
            if (Math.abs(A[row][col]) > maxVal) {
                maxVal = Math.abs(A[row][col]);
                pivotRow = row;
            }
        }

        if (maxVal < 1e-12) {
            // Matrix is singular (or this circuit is under-determined) —
            // e.g. a node with no path to ground, or no voltage source at all.
            console.error("Matrix is singular — circuit may be incomplete (floating node or no source).");
            return null;
        }

        if (pivotRow !== col) {
            [A[col], A[pivotRow]] = [A[pivotRow], A[col]];
            [z[col], z[pivotRow]] = [z[pivotRow], z[col]];
        }

        // --- Eliminate this column from all rows below ---
        for (let row = col + 1; row < n; row++) {
            const factor = A[row][col] / A[col][col];
            for (let c = col; c < n; c++) {
                A[row][c] -= factor * A[col][c];
            }
            z[row] -= factor * z[col];
        }
    }

    // --- Back-substitution: solve from the last row upward ---
    const x = Array(n).fill(0);
    for (let row = n - 1; row >= 0; row--) {
        let sum = z[row];
        for (let col = row + 1; col < n; col++) {
            sum -= A[row][col] * x[col];
        }
        x[row] = sum / A[row][row];
    }

    return x;
}

export interface SolvedCircuit {
    nodeVoltages: Map<string, number>;   // nodeId -> voltage (ground always 0)
    sourceCurrents: Map<string, number>; // componentId -> current through that source
    groundNodeId: string;
}

/**
 * Build the MNA system from the graph and solve it.
 * Returns null if the matrix was singular (incomplete/broken circuit).
 */
export function solveCircuit(graph: CircuitGraph): SolvedCircuit | null {
    const system = buildMNASystem(graph);
    const x = solveLinearSystem(system.A, system.z);

    if (!x) return null;

    const nodeVoltages = new Map<string, number>();
    nodeVoltages.set(system.groundNodeId, 0);
    for (const [nodeId, idx] of system.nodeIndex.entries()) {
        nodeVoltages.set(nodeId, x[idx]);
    }

    const sourceCurrents = new Map<string, number>();
    for (const [componentId, idx] of system.sourceIndex.entries()) {
        sourceCurrents.set(componentId, x[idx]);
    }

/*    console.log("--- solveCircuit: node voltages ---");
    for (const [nodeId, v] of nodeVoltages.entries()) {
        console.log(`  ${nodeId}: ${v.toFixed(4)} V`);
    }

    console.log("--- solveCircuit: source currents ---");
    for (const [componentId, i] of sourceCurrents.entries()) {
        console.log(`  ${componentId}: ${(i * 1000).toFixed(4)} mA`);
    }*/

    return { nodeVoltages, sourceCurrents, groundNodeId: system.groundNodeId };
}