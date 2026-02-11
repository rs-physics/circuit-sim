// src/ui/icons.ts

export type IconKind =
  | "select"
  | "wire"
  | "place"
  | "resistor"
  | "battery"
  | "capacitor"
  | "bulb";

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
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <path d="M12 3v18M3 12h18"/>
      <path d="M7 17h10"/>
    </svg>
  `,

  resistor: `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <path d="M2 12h4l2-3 4 6 4-6 2 3h4"/>
    </svg>
  `,

  battery: `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <path d="M7 7v10"/>
      <path d="M11 9v6"/>
      <path d="M15 9v6"/>
      <path d="M17 7v10"/>
      <path d="M3 12h4M17 12h4"/>
    </svg>
  `,

  capacitor: `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <path d="M7 6v12"/>
      <path d="M17 6v12"/>
      <path d="M3 12h4M17 12h4"/>
    </svg>
  `,

  bulb: `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <path d="M9 18h6"/>
      <path d="M10 22h4"/>
      <path d="M12 2a7 7 0 0 0-4 12c.7.6 1 1.4 1 2h6c0-.6.3-1.4 1-2A7 7 0 0 0 12 2z"/>
    </svg>
  `,
};

export function getIconSvg(kind: IconKind): string {
  return ICONS[kind];
}
