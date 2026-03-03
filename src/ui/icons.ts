// src/ui/icons.ts

export type IconKind =
  | "select"
  | "wire"
  | "place"
  | "resistor"
  | "battery"
  | "capacitor"
  | "bulb"
  | "switch"
  | "varResistor"
  | "ammeter"
  | "voltmeter"
  | "rotate"
  | "delete"
  | "export"
  | "copy";

const ICONS: Record<IconKind, string> = {
  select: `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <path d="M4 4l7 16 2-7 7-2L4 4z"/>
    </svg>
  `,

  wire: `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <path d="M4 8h7a3 3 0 0 1 3 3v5h6"/>
      <circle cx="4" cy="8" r="1.5"/>
      <circle cx="20" cy="16" r="1.5"/>
    </svg>
  `,

  place: `
    <svg viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round">
      <!-- outer circle -->
      <circle cx="12" cy="12" r="8"/>
      <!-- plus -->
      <path d="M12 8v8"/>
      <path d="M8 12h8"/>
    </svg>
  `,


  resistor: `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <!-- leads -->
      <path d="M2 12h4"/>
      <path d="M18 12h4"/>
      <!-- rectangular body -->
      <rect x="6" y="8" width="12" height="8"/>
    </svg>
  `,


  battery: `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <!-- leads -->
      <path d="M2 12h6"/>
      <path d="M16 12h6"/>
      <!-- plates: long then short -->
      <path d="M10 6v12"/>
      <path d="M14 8v8"/>
    </svg>
  `,

  capacitor: `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <!-- leads -->
      <path d="M2 12h7"/>
      <path d="M15 12h7"/>
      <!-- plates -->
      <path d="M9 6v12"/>
      <path d="M15 6v12"/>
    </svg>
  `,

  bulb: `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <!-- leads -->
      <path d="M2 12h5"/>
      <path d="M17 12h5"/>
      <!-- lamp circle -->
      <circle cx="12" cy="12" r="5"/>
      <!-- filament cross -->
      <path d="M9.5 9.5l5 5"/>
      <path d="M14.5 9.5l-5 5"/>
    </svg>
  `,
    switch: `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <!-- left lead -->
      <path d="M2 12h6"/>
      <!-- right lead -->
      <path d="M16 12h6"/>
      <!-- open contact -->
      <circle cx="8" cy="12" r="1"/>
      <circle cx="16" cy="12" r="1"/>
      <!-- lever -->
      <path d="M9 11l5-4"/>
    </svg>
  `,

  varResistor: `
    <svg viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round">
      <!-- leads -->
      <path d="M2 12h4"/>
      <path d="M18 12h4"/>
      <!-- rectangular body -->
      <rect x="6" y="8" width="12" height="8"/>
      <!-- longer diagonal arrow -->
      <path d="M4 20l16-16"/>
      <!-- arrow head -->
      <path d="M15 4h5v5"/>
    </svg>
  `,


  ammeter: `
    <svg viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round">
      <!-- circle -->
      <circle cx="12" cy="12" r="8"/>
      <!-- A -->
      <path d="M9 16l3-8 3 8"/>
      <path d="M10.5 13h3"/>
    </svg>
  `,


  voltmeter: `
    <svg viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round">
      <!-- circle -->
      <circle cx="12" cy="12" r="8"/>
      <!-- V -->
      <path d="M8 9l4 7 4-7"/>
    </svg>
  `,

  rotate: `
    <svg viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round">

      <!-- clockwise half arc (top to right) -->
      <path d="M6 12a6 6 0 0 1 12 0"/>

      <!-- arrow head at right end (clockwise) -->
      <path d="M14 10l4 4 3 -4"/>

    </svg>
  `,

  delete: `
  <svg viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round">
    <!-- bin body -->
    <path d="M4 7h16"/>
    <path d="M6 7l1 12h10l1-12"/>
    <!-- lid -->
    <path d="M9 7V4h6v3"/>
  </svg>
`,

  export: `
    <svg viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round">
      <!-- box -->
      <rect x="4" y="12" width="16" height="8"/>
      <!-- arrow up -->
      <path d="M12 4v10"/>
      <path d="M8 8l4-4 4 4"/>
    </svg>
  `,

  copy: `
    <svg viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round">
      <!-- back sheet -->
      <rect x="9" y="9" width="11" height="11"/>
      <!-- front sheet -->
      <rect x="4" y="4" width="11" height="11"/>
    </svg>
  `,
}
export function getIconSvg(kind: IconKind): string {
  return ICONS[kind];
}
