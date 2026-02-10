import type { ComponentInstance, WireSegment } from "./types";
import type { Selection } from "./selection";

export class EditorState {
  components: ComponentInstance[] = [];
  wires: WireSegment[] = [];
  selection: Selection = null;
}