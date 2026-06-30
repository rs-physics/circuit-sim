// src/render/readableRotation.ts

export type SymbolRotationMode = "full" | "readable";

/**
 * Keep rotations in the 0/90/180/270 style range.
 */
function normaliseRotation(rotation: number): number {
    return ((rotation % 360) + 360) % 360;
}

/**
 * Used for world-space labels.
 *
 * 0   -> 0
 * 90  -> 90
 * 180 -> 0
 * 270 -> 270
 */
export function readableWorldRotation(rotation: number): number {
    const r = normaliseRotation(rotation);

    if (r === 180) {
        return 0;
    }

    return r;
}

/**
 * Used for drawing whole symbols.
 *
 * "full":
 * 0 -> 0, 90 -> 90, 180 -> 180, 270 -> 270
 *
 * "readable":
 * 0 -> 0, 90 -> 90, 180 -> 0, 270 -> 270
 */
export function symbolDisplayRotation(
    rotation: number,
    mode: SymbolRotationMode
): number {
    const r = normaliseRotation(rotation);

    if (mode === "full") {
        return r;
    }

    if (r === 180) {
        return 0;
    }

    return r;
}