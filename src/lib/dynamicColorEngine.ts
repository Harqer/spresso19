// Material 3 Dynamic Color & Tonal Palette Generator
// Implements Material You seed-to-scheme algorithm & tonal elevation system

export interface HSL {
  h: number; // 0..360
  s: number; // 0..100
  l: number; // 0..100
}

export interface RGB {
  r: number;
  g: number;
  b: number;
}

export interface TonalPalette {
  0: string;
  10: string;
  20: string;
  30: string;
  40: string;
  50: string;
  60: string;
  70: string;
  80: string;
  90: string;
  95: string;
  98: string;
  100: string;
}

export interface MaterialSchemeTokens {
  // Primary
  primary: string;
  onPrimary: string;
  primaryContainer: string;
  onPrimaryContainer: string;
  
  // Secondary
  secondary: string;
  onSecondary: string;
  secondaryContainer: string;
  onSecondaryContainer: string;

  // Tertiary
  tertiary: string;
  onTertiary: string;
  tertiaryContainer: string;
  onTertiaryContainer: string;

  // Neutral / Backgrounds
  background: string;
  onBackground: string;
  surface: string;
  onSurface: string;
  surfaceVariant: string;
  onSurfaceVariant: string;

  // Surface Containers (Tonal Elevation Levels)
  surfaceDim: string;
  surfaceBright: string;
  surfaceContainerLowest: string;
  surfaceContainerLow: string;
  surfaceContainer: string;
  surfaceContainerHigh: string;
  surfaceContainerHighest: string;

  // Borders & Outlines
  outline: string;
  outlineVariant: string;
  inverseSurface: string;
  inverseOnSurface: string;
  inversePrimary: string;

  // Shadows & Scrim
  shadow: string;
  scrim: string;
}

export interface ThemeSeedPreset {
  id: string;
  name: string;
  hex: string;
  secondaryHex?: string;
  category: string;
}

export const SEED_PRESETS: ThemeSeedPreset[] = [
  { id: "charcoal_lime", name: "Charcoal & Electric Lime", hex: "#1e2229", secondaryHex: "#84cc16", category: "Material You High Contrast" },
  { id: "obsidian_lime", name: "Obsidian & Neon Lime", hex: "#121417", secondaryHex: "#a3e635", category: "Material You High Contrast" },
  { id: "charcoal_mint", name: "Charcoal & Mint Green", hex: "#22262b", secondaryHex: "#10b981", category: "Material You High Contrast" },
  { id: "emerald", name: "Spresso Natural Green", hex: "#446732", category: "Botanical" },
  { id: "sapphire", name: "Deep Ocean Sapphire", hex: "#1d5c8d", category: "Cool Waters" },
  { id: "violet", name: "Royal Amethyst", hex: "#673ab7", category: "Vibrant" },
  { id: "terracotta", name: "Warm Terracotta Rose", hex: "#b84a39", category: "Earth Tones" },
];

// Helper: Hex to RGB
export function hexToRgb(hex: string): RGB {
  let cleanHex = hex.replace("#", "");
  if (cleanHex.length === 3) {
    cleanHex = cleanHex.split("").map((c) => c + c).join("");
  }
  const num = parseInt(cleanHex, 16);
  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255,
  };
}

// Helper: RGB to Hex
export function rgbToHex(r: number, g: number, b: number): string {
  const clamp = (val: number) => Math.max(0, Math.min(255, Math.round(val)));
  return (
    "#" +
    [r, g, b]
      .map((x) => clamp(x).toString(16).padStart(2, "0"))
      .join("")
  );
}

// Helper: RGB to HSL
export function rgbToHsl(r: number, g: number, b: number): HSL {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0);
        break;
      case g:
        h = (b - r) / d + 2;
        break;
      case b:
        h = (r - g) / d + 4;
        break;
    }
    h /= 6;
  }

  return {
    h: Math.round(h * 360),
    s: Math.round(s * 100),
    l: Math.round(l * 100),
  };
}

// Helper: HSL to Hex
export function hslToHex(h: number, s: number, l: number): string {
  s /= 100;
  l /= 100;
  const k = (n: number) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) =>
    l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  return rgbToHex(255 * f(0), 255 * f(8), 255 * f(4));
}

// Generate 13 Tonal Palette values for a given Hue & Saturation
export function generateTonalPalette(hue: number, saturation: number): TonalPalette {
  const toneToLuminance: Record<number, number> = {
    0: 0,
    10: 10,
    20: 20,
    30: 30,
    40: 40,
    50: 50,
    60: 60,
    70: 70,
    80: 80,
    90: 90,
    95: 95,
    98: 98,
    100: 100,
  };

  const palette: Partial<TonalPalette> = {};
  for (const tone of [0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 95, 98, 100]) {
    const l = toneToLuminance[tone];
    // Dampen saturation slightly in extreme darks and lights for realistic pigment behavior
    const adjSat = tone === 0 || tone === 100 ? 0 : Math.min(saturation, tone < 30 || tone > 90 ? saturation * 0.75 : saturation);
    (palette as any)[tone] = hslToHex(hue, adjSat, l);
  }

  return palette as TonalPalette;
}

// Generate the 5 Key Tonal Palettes from Seed Color
export interface FiveTonalPalettes {
  primary: TonalPalette;
  secondary: TonalPalette;
  tertiary: TonalPalette;
  neutral: TonalPalette;
  neutralVariant: TonalPalette;
}

export function generateFiveTonalPalettes(seedHex: string, secondarySeedHex?: string): FiveTonalPalettes {
  const rgb = hexToRgb(seedHex);
  const hsl = rgbToHsl(rgb.r, rgb.g, rgb.b);

  const hue = hsl.h;
  const sat = hsl.s;
  const light = hsl.l;

  // Primary: Hue & Saturation
  const primarySat = Math.max(10, Math.min(sat, 85));
  const primary = generateTonalPalette(hue, primarySat);

  // Secondary: If secondarySeedHex is provided, or if seed is charcoal/dark (low sat or low light),
  // derive a vibrant Lime Green (Hue ~84, Sat ~85) secondary palette so cards & accents pop out!
  let secondary: TonalPalette;
  if (secondarySeedHex) {
    const secRgb = hexToRgb(secondarySeedHex);
    const secHsl = rgbToHsl(secRgb.r, secRgb.g, secRgb.b);
    secondary = generateTonalPalette(secHsl.h, Math.max(50, secHsl.s));
  } else if (sat < 25 || light < 30) {
    // Charcoal / Black seed -> Lime green secondary accent (Hue: 84, Saturation: 85)
    secondary = generateTonalPalette(84, 85);
  } else {
    secondary = generateTonalPalette(hue, Math.max(15, Math.round(primarySat * 0.4)));
  }

  // Tertiary: Lime-Cyan / Emerald offset (Hue + 60deg), Saturation ~60
  const tertiaryHue = (hue + 60) % 360;
  const tertiary = generateTonalPalette(tertiaryHue, Math.max(35, Math.round(primarySat * 0.75)));

  // Neutral: Hue, Saturation ~4 (very low saturation for clean surfaces)
  const neutral = generateTonalPalette(hue, 6);

  // Neutral Variant: Hue, Saturation ~10 (for outlines, surface variants)
  const neutralVariant = generateTonalPalette(hue, 12);

  return { primary, secondary, tertiary, neutral, neutralVariant };
}

// Map Tonal Palettes into Material Light or Dark Scheme Tokens
export function generateMaterialScheme(
  palettes: FiveTonalPalettes,
  mode: "light" | "dark"
): MaterialSchemeTokens {
  const { primary, secondary, tertiary, neutral, neutralVariant } = palettes;

  if (mode === "light") {
    return {
      primary: primary[40],
      onPrimary: primary[100],
      primaryContainer: primary[90],
      onPrimaryContainer: primary[10],

      secondary: secondary[40],
      onSecondary: secondary[100],
      secondaryContainer: secondary[90],
      onSecondaryContainer: secondary[10],

      tertiary: tertiary[40],
      onTertiary: tertiary[100],
      tertiaryContainer: tertiary[90],
      onTertiaryContainer: tertiary[10],

      background: neutral[98],
      onBackground: neutral[10],
      surface: neutral[98],
      onSurface: neutral[10],
      surfaceVariant: neutralVariant[90],
      onSurfaceVariant: neutralVariant[30],

      // Tonal Elevation Levels (Light Mode)
      surfaceDim: neutral[87],
      surfaceBright: neutral[98],
      surfaceContainerLowest: neutral[100],
      surfaceContainerLow: neutral[96],
      surfaceContainer: neutral[94],
      surfaceContainerHigh: neutral[92],
      surfaceContainerHighest: neutral[90],

      outline: neutralVariant[50],
      outlineVariant: neutralVariant[80],
      inverseSurface: neutral[20],
      inverseOnSurface: neutral[95],
      inversePrimary: primary[80],

      shadow: "#000000",
      scrim: "#000000",
    };
  } else {
    return {
      primary: primary[80],
      onPrimary: primary[20],
      primaryContainer: primary[30],
      onPrimaryContainer: primary[90],

      secondary: secondary[80],
      onSecondary: secondary[20],
      secondaryContainer: secondary[30],
      onSecondaryContainer: secondary[90],

      tertiary: tertiary[80],
      onTertiary: tertiary[20],
      tertiaryContainer: tertiary[30],
      onTertiaryContainer: tertiary[90],

      background: neutral[6],
      onBackground: neutral[90],
      surface: neutral[6],
      onSurface: neutral[90],
      surfaceVariant: neutralVariant[30],
      onSurfaceVariant: neutralVariant[80],

      // Tonal Elevation Levels (Dark Mode)
      surfaceDim: neutral[6],
      surfaceBright: neutral[24],
      surfaceContainerLowest: neutral[4],
      surfaceContainerLow: neutral[10],
      surfaceContainer: neutral[12],
      surfaceContainerHigh: neutral[17],
      surfaceContainerHighest: neutral[22],

      outline: neutralVariant[60],
      outlineVariant: neutralVariant[30],
      inverseSurface: neutral[90],
      inverseOnSurface: neutral[20],
      inversePrimary: primary[40],

      shadow: "#000000",
      scrim: "#000000",
    };
  }
}

// Inject Scheme Tokens into CSS Custom Properties (`:root` / `--md-sys-color-*`)
export function applyDynamicThemeToDocument(
  seedHex: string,
  mode: "light" | "dark",
  secondarySeedHex?: string
) {
  const palettes = generateFiveTonalPalettes(seedHex, secondarySeedHex);
  const scheme = generateMaterialScheme(palettes, mode);

  const root = document.documentElement;

  // Apply CSS Variables for M3 Tokens
  root.style.setProperty("--md-sys-color-primary", scheme.primary);
  root.style.setProperty("--md-sys-color-on-primary", scheme.onPrimary);
  root.style.setProperty("--md-sys-color-primary-container", scheme.primaryContainer);
  root.style.setProperty("--md-sys-color-on-primary-container", scheme.onPrimaryContainer);

  root.style.setProperty("--md-sys-color-secondary", scheme.secondary);
  root.style.setProperty("--md-sys-color-on-secondary", scheme.onSecondary);
  root.style.setProperty("--md-sys-color-secondary-container", scheme.secondaryContainer);
  root.style.setProperty("--md-sys-color-on-secondary-container", scheme.onSecondaryContainer);

  root.style.setProperty("--md-sys-color-tertiary", scheme.tertiary);
  root.style.setProperty("--md-sys-color-on-tertiary", scheme.onTertiary);
  root.style.setProperty("--md-sys-color-tertiary-container", scheme.tertiaryContainer);
  root.style.setProperty("--md-sys-color-on-tertiary-container", scheme.onTertiaryContainer);

  root.style.setProperty("--md-sys-color-background", scheme.background);
  root.style.setProperty("--md-sys-color-on-background", scheme.onBackground);
  root.style.setProperty("--md-sys-color-surface", scheme.surface);
  root.style.setProperty("--md-sys-color-on-surface", scheme.onSurface);
  root.style.setProperty("--md-sys-color-surface-variant", scheme.surfaceVariant);
  root.style.setProperty("--md-sys-color-on-surface-variant", scheme.onSurfaceVariant);

  root.style.setProperty("--md-sys-color-surface-dim", scheme.surfaceDim);
  root.style.setProperty("--md-sys-color-surface-bright", scheme.surfaceBright);
  root.style.setProperty("--md-sys-color-surface-container-lowest", scheme.surfaceContainerLowest);
  root.style.setProperty("--md-sys-color-surface-container-low", scheme.surfaceContainerLow);
  root.style.setProperty("--md-sys-color-surface-container", scheme.surfaceContainer);
  root.style.setProperty("--md-sys-color-surface-container-high", scheme.surfaceContainerHigh);
  root.style.setProperty("--md-sys-color-surface-container-highest", scheme.surfaceContainerHighest);

  root.style.setProperty("--md-sys-color-outline", scheme.outline);
  root.style.setProperty("--md-sys-color-outline-variant", scheme.outlineVariant);

  // Sync Legacy Theme Tokens for backward compatibility
  root.style.setProperty("--color-brand-primary", scheme.primary);
  root.style.setProperty("--color-brand-light", scheme.primaryContainer);
  root.style.setProperty("--bg-main", scheme.background);
  root.style.setProperty("--bg-surface", scheme.surfaceContainerLow);
  root.style.setProperty("--bg-surface-elevated", scheme.surfaceContainerHigh);
  root.style.setProperty("--border-color", scheme.outlineVariant);
  root.style.setProperty("--text-primary", scheme.onSurface);
  root.style.setProperty("--text-secondary", scheme.onSurfaceVariant);

  return { palettes, scheme };
}

// Extract dominant seed color from an Image object / URL using HTML Canvas
export function extractSeedColorFromImage(imageSrc: string): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "Anonymous";
    img.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        if (!ctx) return resolve("#1e2229");

        canvas.width = 64;
        canvas.height = 64;
        ctx.drawImage(img, 0, 0, 64, 64);

        const imgData = ctx.getImageData(0, 0, 64, 64).data;
        let rSum = 0, gSum = 0, bSum = 0, count = 0;

        for (let i = 0; i < imgData.length; i += 16) {
          const r = imgData[i];
          const g = imgData[i + 1];
          const b = imgData[i + 2];
          const a = imgData[i + 3];

          // Skip near black/white or transparent pixels
          const maxVal = Math.max(r, g, b);
          const minVal = Math.min(r, g, b);
          if (a > 200 && maxVal - minVal > 20 && maxVal < 240 && minVal > 15) {
            rSum += r;
            gSum += g;
            bSum += b;
            count++;
          }
        }

        if (count > 0) {
          const avgR = Math.round(rSum / count);
          const avgG = Math.round(gSum / count);
          const avgB = Math.round(bSum / count);
          resolve(rgbToHex(avgR, avgG, avgB));
        } else {
          resolve("#1e2229");
        }
      } catch (e) {
        resolve("#1e2229");
      }
    };
    img.onerror = () => resolve("#1e2229");
    img.src = imageSrc;
  });
}
