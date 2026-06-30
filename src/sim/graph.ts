import type { WireSegment, ComponentInstance } from "../editor/types";
import type { ComponentType } from "../editor/componentType";
import type { Point } from "../editor/grid";
import type { SimRole } from "./simRole";
import { resolveSimRole } from "./simRole";
import { UnionFind } from "./unionFind";

function pointKey(p: Point): string {
    return `${p.x},${p.y}`;
}

export interface SimNode {
    id: string;       // = union-find root pointKey
    point: Point;      // representative coordinate for this node
}

export interface SimBranch {
    componentId: string;     // ComponentInstance.id — for matching back to the editor if needed
    role: SimRole | null;    // null = component has no simRole() yet (unsupported in sim)
    portAName: string;       // e.g. "+" or "A"
    portBName: string;       // e.g. "-" or "B"
    nodeAId: string;          // node that portA resolves to
    nodeBId: string;          // node that portB resolves to
}

export interface CircuitGraph {
    nodes: SimNode[];
    branches: SimBranch[];
}

/**
 * sim/graph.ts
 *
 * Step 1: group wire-connected points into electrical nodes (union-find).
 * Step 2: resolve each component's two ports to their node, AND resolve
 *         its SimRole once here — downstream consumers (MNA, animation)
 *         read role/port info straight off the branch, no getType needed.
 *
 * Console logs from earlier testing are commented out (not deleted) so they
 * can be re-enabled individually if something needs debugging again.
 */
export function buildGraph(
    wires: WireSegment[],
    components: ComponentInstance[],
    getType: (typeId: string) => ComponentType
): CircuitGraph {
    const uf = new UnionFind();

    // --- Step 1: node grouping ---
    for (const wire of wires) {
        uf.union(pointKey(wire.a), pointKey(wire.b));
    }

    const pointByKey = new Map<string, Point>();
    for (const wire of wires) {
        pointByKey.set(pointKey(wire.a), wire.a);
        pointByKey.set(pointKey(wire.b), wire.b);
    }

    // Also register component port points (covers a component with no wire touching it).
    for (const inst of components) {
        const t = getType(inst.typeId);
        for (const port of t.portWorldPositions(inst)) {
            pointByKey.set(pointKey(port.pos), port.pos);
        }
    }

    // console.log("--- buildGraph: point groupings ---");
    // for (const p of pointByKey.keys()) {
    //   console.log(`  ${p} -> ${uf.find(p)}`);
    // }

    // const groups = new Map<string, string[]>();
    // for (const p of pointByKey.keys()) {
    //   const root = uf.find(p);
    //   if (!groups.has(root)) groups.set(root, []);
    //   groups.get(root)!.push(p);
    // }

    // console.log("--- buildGraph: grouped by node ---");
    // for (const [root, members] of groups.entries()) {
    //   console.log(`  Node [${root}]:`, members);
    // }

    // Build the SimNode list: one per unique root.
    const nodeByRoot = new Map<string, SimNode>();
    for (const key of pointByKey.keys()) {
        const root = uf.find(key);
        if (!nodeByRoot.has(root)) {
            nodeByRoot.set(root, { id: root, point: pointByKey.get(root)! });
        }
    }

    // --- Step 2: components -> branches (with resolved SimRole) ---
    //console.log("--- buildGraph: component branches ---");
    const branches: SimBranch[] = [];

    for (const inst of components) {
        const t = getType(inst.typeId);
        const ports = t.portWorldPositions(inst);

        if (ports.length !== 2) {
            console.log(`  ${inst.typeId} (${inst.id}): skipped, not a 2-port component`);
            continue;
        }

        const nodeAId = uf.find(pointKey(ports[0].pos));
        const nodeBId = uf.find(pointKey(ports[1].pos));
        const role = resolveSimRole(inst, t);

        branches.push({
            componentId: inst.id,
            role,
            portAName: ports[0].name,
            portBName: ports[1].name,
            nodeAId,
            nodeBId,
        });

/*        console.log(
            `  ${inst.typeId} (${inst.id}): role=${role ? role.kind : "UNSUPPORTED"}, ` +
            `port "${ports[0].name}" -> Node [${nodeAId}], port "${ports[1].name}" -> Node [${nodeBId}]`
        );*/
    }

    return {
        nodes: Array.from(nodeByRoot.values()),
        branches,
    };
}

export function extractMnaGraph(graph: CircuitGraph): CircuitGraph {
    const stampableBranches = graph.branches.filter((branch) => {
        return (
            branch.role?.kind === "resistor" ||
            branch.role?.kind === "voltageSource" ||
            branch.role?.kind === "ammeter"
        );
    });

    const sourceBranch = stampableBranches.find((branch) => {
        return branch.role?.kind === "voltageSource";
    });

    if (!sourceBranch) {
        return {
            nodes: [],
            branches: [],
        };
    }

    const reachableNodeIds = new Set<string>();
    const reachableBranches = new Set<SimBranch>();

    const stack: string[] = [
        sourceBranch.nodeAId,
        sourceBranch.nodeBId,
    ];

    while (stack.length > 0) {
        const nodeId = stack.pop()!;

        if (reachableNodeIds.has(nodeId)) continue;
        reachableNodeIds.add(nodeId);

        for (const branch of stampableBranches) {
            const touchesNode =
                branch.nodeAId === nodeId || branch.nodeBId === nodeId;

            if (!touchesNode) continue;

            reachableBranches.add(branch);

            if (!reachableNodeIds.has(branch.nodeAId)) {
                stack.push(branch.nodeAId);
            }

            if (!reachableNodeIds.has(branch.nodeBId)) {
                stack.push(branch.nodeBId);
            }
        }
    }

    return {
        nodes: graph.nodes.filter((node) => reachableNodeIds.has(node.id)),
        branches: Array.from(reachableBranches),
    };
}