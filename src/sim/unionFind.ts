/**
 * sim/unionFind.ts
 *
 * Standalone union-find (disjoint set union) with path compression.
 *
 * Purpose: group points that are connected (directly or transitively)
 * by a wire, so each group can later become a single electrical node.
 *
 * This file does ONLY the union-find algorithm. Nothing circuit-specific
 * yet — that comes later once this is proven to work.
 */

export class UnionFind {
    private parent = new Map<string, string>();

    private ensure(key: string) {
        if (!this.parent.has(key)) this.parent.set(key, key); // own leader initially
    }

    find(key: string): string {
        this.ensure(key);
        const p = this.parent.get(key)!;
        if (p === key) return key; // I am my own leader — I'm the root
        const root = this.find(p); // walk up to find the real root
        this.parent.set(key, root); // path compression
        return root;
    }

    union(a: string, b: string) {
        const rootA = this.find(a);
        const rootB = this.find(b);
        if (rootA !== rootB) this.parent.set(rootA, rootB);
    }
}

// -----------------------------------------------------------------------------
// Manual test — run this file directly (or call runUnionFindTest() from
// somewhere temporary in app.ts) to see the grouping behaviour in the console.
// -----------------------------------------------------------------------------

export function runUnionFindTest() {
    const uf = new UnionFind();

    // Simulate: A-B-C are wire-connected in a chain.
    // D-E are wire-connected separately.
    // F is on its own, never unioned with anything.
    uf.union("A", "B");
    uf.union("B", "C");
    uf.union("D", "E");
    // F is never unioned with anything

    const points = ["A", "B", "C", "D", "E", "F"];

    console.log("Point -> Root (group):");
    for (const p of points) {
        console.log(`  ${p} -> ${uf.find(p)}`);
    }
}