/**
 * tokens.js
 * Single source of truth for all design tokens.
 * Used as inline styles throughout the component tree
 * (no Tailwind build step required in this artifact env).
 */

export const T = {
  // Backgrounds
  bg:          "#07090E",
  surface:     "#0C0F18",
  panel:       "#10141F",
  panelHover:  "#13182A",
  faint:       "#141824",
  subtle:      "#1E2534",

  // Borders
  border:       "rgba(255,255,255,0.07)",
  borderHover:  "rgba(99,179,237,0.35)",
  borderAccent: "rgba(99,179,237,0.2)",

  // Accent palette
  cyan:     "#63B3ED",
  cyanDim:  "rgba(99,179,237,0.12)",
  cyanGlow: "rgba(99,179,237,0.3)",
  blue:     "#4299E1",
  blueDim:  "rgba(66,153,225,0.12)",

  // Risk palette
  green:    "#68D391",
  greenDim: "rgba(104,211,145,0.1)",
  amber:    "#F6AD55",
  amberDim: "rgba(246,173,85,0.1)",
  red:      "#FC8181",
  redDim:   "rgba(252,129,129,0.1)",

  // Typography
  text:   "#EDF2F7",
  muted:  "#4A5568",
  faded:  "#2D3748",

  // Font stacks
  mono:  "'DM Mono', 'Fira Code', monospace",
  sans:  "'DM Sans', system-ui, sans-serif",
  serif: "'Instrument Serif', Georgia, serif",

  // Radii
  r4:  "4px",
  r8:  "8px",
  r10: "10px",
  r12: "12px",
  r16: "16px",
  r20: "20px",
  rFull: "9999px",
};

/** Risk level → color mapping */
export const RISK_COLORS = {
  high:   { fg: T.red,   bg: T.redDim,   border: "rgba(252,129,129,0.3)"  },
  medium: { fg: T.amber, bg: T.amberDim, border: "rgba(246,173,85,0.3)"   },
  low:    { fg: T.green, bg: T.greenDim, border: "rgba(104,211,145,0.3)"  },
  unknown:{ fg: T.muted, bg: T.subtle,   border: T.border                  },
};

/** Shared motion variants for Framer Motion */
export const VARIANTS = {
  fadeUp: {
    hidden:  { opacity: 0, y: 16 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.35, ease: "easeOut" } },
    exit:    { opacity: 0, y: -8, transition: { duration: 0.2 } },
  },
  fadeIn: {
    hidden:  { opacity: 0 },
    visible: { opacity: 1, transition: { duration: 0.3 } },
    exit:    { opacity: 0, transition: { duration: 0.15 } },
  },
  slideRight: {
    hidden:  { opacity: 0, x: -20 },
    visible: { opacity: 1, x: 0, transition: { duration: 0.3, ease: "easeOut" } },
    exit:    { opacity: 0, x: 20, transition: { duration: 0.2 } },
  },
  stagger: {
    visible: { transition: { staggerChildren: 0.07 } },
  },
};
