export const THEME = {
  colors: {
    primary: "#386633", // World Peas Forest Green
    primaryHover: "#2c5227", // Dark Forest Green
    primaryLight: "#e8f3e8", // Soft Emerald Light Tint
    primarySoft: "#f2f8f2", // Soft Green Canvas
    primaryBorder: "#b0d4af", // Soft Green Border
    accent: "#386633",
    dark: "#18211e",
    surface: "#ffffff",
    canvas: "#fafcf9",
    textMuted: "#5e635f"
  },
  classes: {
    btnPrimary: "bg-[#386633] hover:bg-[#2c5227] text-white font-medium rounded-xl transition cursor-pointer shadow-xs",
    btnPrimarySm: "px-3 py-1.5 bg-[#386633] hover:bg-[#2c5227] text-white text-xs font-medium rounded-lg transition cursor-pointer shadow-xs",
    btnSecondary: "bg-[#e8f3e8] hover:bg-[#d8ebd7] text-[#386633] font-medium rounded-xl transition cursor-pointer",
    btnOutline: "border border-[#386633] text-[#386633] hover:bg-[#e8f3e8] font-medium rounded-xl transition cursor-pointer",
    badgeGreen: "bg-[#386633] text-white font-mono text-[10px] font-bold rounded-full px-2 py-0.5",
    cardGreen: "bg-white border border-[#d2e4d1] rounded-2xl p-4 shadow-xs hover:border-[#386633] transition"
  }
} as const;
