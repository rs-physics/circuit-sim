import type { ComponentInstance } from "./types";

export class EditorState {
  components: ComponentInstance[] = [];
  selectedId: string | null = null;
}