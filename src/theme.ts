export const THEME = {
  colors: {
    primary: "var(--md-sys-color-primary)",
    primaryHover: "var(--color-brand-hover)",
    primaryLight: "var(--md-sys-color-primary-container)",
    primarySoft: "var(--md-sys-color-surface-container-low)",
    primaryBorder: "var(--md-sys-color-outline-variant)",
    accent: "var(--md-sys-color-secondary)",
    dark: "var(--md-sys-color-surface-dim)",
    surface: "var(--md-sys-color-surface-container-lowest)",
    canvas: "var(--md-sys-color-background)",
    textMuted: "var(--md-sys-color-on-surface-variant)"
  },
  classes: {
    btnPrimary: "bg-[var(--md-sys-color-primary)] hover:opacity-90 text-[var(--md-sys-color-on-primary)] font-medium rounded-xl transition cursor-pointer shadow-xs",
    btnPrimarySm: "px-3 py-1.5 bg-[var(--md-sys-color-primary)] hover:opacity-90 text-[var(--md-sys-color-on-primary)] text-xs font-medium rounded-lg transition cursor-pointer shadow-xs",
    btnSecondary: "bg-[var(--md-sys-color-surface-container)] hover:bg-[var(--md-sys-color-surface-container-high)] text-[var(--md-sys-color-on-surface)] font-medium rounded-xl transition cursor-pointer",
    btnOutline: "border border-[var(--md-sys-color-primary)] text-[var(--md-sys-color-primary)] hover:bg-[var(--md-sys-color-surface-container)] font-medium rounded-xl transition cursor-pointer",
    badgeGreen: "bg-[var(--md-sys-color-primary)] text-[var(--md-sys-color-on-primary)] font-mono text-[10px] font-bold rounded-full px-2 py-0.5",
    cardGreen: "bg-[var(--md-sys-color-surface-container-lowest)] border border-[var(--md-sys-color-outline-variant)] rounded-2xl p-4 shadow-xs hover:border-[var(--md-sys-color-primary)] transition"
  }
} as const;
