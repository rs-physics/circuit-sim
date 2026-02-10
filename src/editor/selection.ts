/**
 * Current editor selection.
 *
 * V1 supports selecting:
 * - a single component instance (by id)
 * - a single wire segment (by id)
 *
 * null means "nothing selected".
 *
 * Note: this is editor/UI state, not simulation state.
 */
export type Selection =
  | { kind: "component"; id: string }
  | { kind: "wire"; id: string }
  | null;
