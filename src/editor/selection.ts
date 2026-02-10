export type Selection =
  | { kind: "component"; id: string }
  | { kind: "wire"; id: string }
  | null;