// Brand palette generator: one admin-picked colour in, a full, readable
// light AND dark theme out.
//
// Rules (so a badly-matched pick can never make the site unreadable):
//  1. Hue is the only thing taken from the pick as-is. Everything else is
//     built around it with the "60-30-10" rule: ~60% neutral surfaces that
//     only carry a whisper of the hue, ~30% text/border neutrals, ~10% the
//     accent itself.
//  2. Surfaces are always near-white (light) or near-black (dark), whatever
//     was picked — a light pick never produces a light dark-mode.
//  3. Every text/background pair is checked against WCAG 2.1 contrast and
//     nudged in lightness until it passes: body text >= 7:1, muted text and
//     links >= 4.5:1, white text on the accent button >= 4.5:1.
//  4. Dark mode uses the accent desaturated a little and lightened enough to
//     stand out against dark surfaces (saturated colours "vibrate" on dark).
//  5. Tints (soft badge backgrounds) share the hue at very low chroma so
//     they feel related, not pasted on.

import type { CSSProperties } from "react";

type HSL = { h: number; s: number; l: number };

const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n));

export const isHex = (v: string | null | undefined): v is string => !!v && /^#[0-9a-fA-F]{6}$/.test(v);

function hexToHsl(hex: string): HSL {
  const n = parseInt(hex.slice(1), 16);
  const r = ((n >> 16) & 255) / 255;
  const g = ((n >> 8) & 255) / 255;
  const b = (n & 255) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  const d = max - min;
  let h = 0;
  let s = 0;
  if (d !== 0) {
    s = d / (1 - Math.abs(2 * l - 1));
    if (max === r) h = ((g - b) / d) % 6;
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h *= 60;
    if (h < 0) h += 360;
  }
  return { h, s: s * 100, l: l * 100 };
}

function hslToHex({ h, s, l }: HSL): string {
  const S = clamp(s, 0, 100) / 100;
  const L = clamp(l, 0, 100) / 100;
  const k = (n: number) => (n + h / 30) % 12;
  const a = S * Math.min(L, 1 - L);
  const f = (n: number) => L - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  const to = (x: number) =>
    Math.round(x * 255)
      .toString(16)
      .padStart(2, "0");
  return `#${to(f(0))}${to(f(8))}${to(f(4))}`;
}

function luminance(hex: string): number {
  const n = parseInt(hex.slice(1), 16);
  const ch = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * ch[0] + 0.7152 * ch[1] + 0.0722 * ch[2];
}

export function contrast(a: string, b: string): number {
  const la = luminance(a);
  const lb = luminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

// Moves lightness (in `dir` direction) until `color` reaches `min` contrast
// against every background in `against`.
function ensure(color: HSL, against: string[], min: number, dir: 1 | -1): HSL {
  const c = { ...color };
  for (let i = 0; i < 100; i++) {
    if (against.every((bg) => contrast(hslToHex(c), bg) >= min)) break;
    const next = c.l + dir;
    if (next < 0 || next > 100) break;
    c.l = next;
  }
  return c;
}

export interface ThemeVars {
  "--background": string;
  "--surface": string;
  "--surface-alt": string;
  "--foreground": string;
  "--muted": string;
  "--border": string;
  "--brand": string;
  "--brand-dark": string;
  "--brand-soft": string;
  // Text colour for anything painted with the accent (buttons, active nav).
  "--on-brand": string;
}

export interface BrandPalette {
  light: ThemeVars;
  dark: ThemeVars;
  // True when the picked colour had to be darkened/lightened to stay readable.
  adjusted: boolean;
}

// White or near-black, whichever stays more readable over BOTH ends of the
// accent gradient (brand -> brand-dark). Light accents get dark text.
function onBrand(brand: string, brandDark: string): string {
  const dark = "#0b1220";
  const minOf = (fg: string) => Math.min(contrast(fg, brand), contrast(fg, brandDark));
  return minOf("#ffffff") >= minOf(dark) ? "#ffffff" : dark;
}

export function buildPalette(pick: string): BrandPalette {
  const { h, s: pickS, l: pickL } = hexToHsl(pick);
  // Near-grey picks have no meaningful hue; keep everything neutral for them.
  const grey = pickS < 8;
  const sat = (v: number) => (grey ? Math.min(v, 6) : v);

  // ---------- Light ----------
  const lBg = hslToHex({ h, s: sat(clamp(pickS * 0.4, 12, 34)), l: 97.5 });
  const lSurface = "#ffffff";
  const lSurfaceAlt = hslToHex({ h, s: sat(clamp(pickS * 0.4, 12, 30)), l: 94.5 });
  const lBorder = hslToHex({ h, s: sat(clamp(pickS * 0.3, 10, 26)), l: 88 });
  const lFg = hslToHex(ensure({ h, s: sat(clamp(pickS, 20, 40)), l: 11 }, [lBg, lSurface, lSurfaceAlt], 10, -1));
  const lMuted = hslToHex(ensure({ h, s: sat(clamp(pickS * 0.3, 10, 18)), l: 44 }, [lBg, lSurface, lSurfaceAlt], 4.5, -1));
  // Accent: keep as picked, but dark enough for white button text.
  const lBrandHsl = ensure({ h, s: clamp(pickS, grey ? 0 : 35, 100), l: pickL }, ["#ffffff"], 4.5, -1);
  const lBrand = hslToHex(lBrandHsl);
  const lSoft = hslToHex({ h, s: sat(clamp(pickS, 30, 90)), l: 94 });
  // "Primary": deeper sibling of the accent — gradient end, hover, and text on
  // the soft tint, so it must read on it at 7:1.
  const lBrandDark = hslToHex(
    ensure({ h, s: sat(clamp(pickS * 0.9, 35, 80)), l: Math.min(18, lBrandHsl.l - 8) }, [lSoft, lSurface], 7, -1)
  );

  // ---------- Dark ----------
  const dBg = hslToHex({ h, s: sat(clamp(pickS * 0.45, 14, 34)), l: 7.5 });
  const dSurface = hslToHex({ h, s: sat(clamp(pickS * 0.45, 14, 32)), l: 11 });
  const dSurfaceAlt = hslToHex({ h, s: sat(clamp(pickS * 0.45, 14, 30)), l: 14.5 });
  const dBorder = hslToHex({ h, s: sat(clamp(pickS * 0.35, 12, 26)), l: 22 });
  const dFg = hslToHex({ h, s: sat(14), l: 93 });
  const dMuted = hslToHex(ensure({ h, s: sat(12), l: 62 }, [dBg, dSurface, dSurfaceAlt], 4.5, 1));
  // Accent on dark: a touch less saturated (avoids vibrating) and light enough
  // to hit 4.5:1 against the raised surface so links/outlines stay legible.
  const dBrandHsl = ensure({ h, s: Math.min(pickS, 82), l: clamp(pickL, 45, 72) }, [dSurface, dSurfaceAlt], 4.5, 1);
  const dBrand = hslToHex(dBrandHsl);
  const dSoft = hslToHex({ h, s: sat(clamp(pickS * 0.5, 24, 55)), l: 17 });
  const dBrandDark = hslToHex(ensure({ h, s: sat(clamp(pickS, 40, 90)), l: 76 }, [dSoft, dSurface], 7, 1));

  return {
    light: {
      "--background": lBg,
      "--surface": lSurface,
      "--surface-alt": lSurfaceAlt,
      "--foreground": lFg,
      "--muted": lMuted,
      "--border": lBorder,
      "--brand": lBrand,
      "--brand-dark": lBrandDark,
      "--brand-soft": lSoft,
      "--on-brand": onBrand(lBrand, lBrandDark),
    },
    dark: {
      "--background": dBg,
      "--surface": dSurface,
      "--surface-alt": dSurfaceAlt,
      "--foreground": dFg,
      "--muted": dMuted,
      "--border": dBorder,
      "--brand": dBrand,
      "--brand-dark": dBrandDark,
      "--brand-soft": dSoft,
      "--on-brand": onBrand(dBrand, dBrandDark),
    },
    adjusted: Math.abs(lBrandHsl.l - pickL) > 2,
  };
}

const decl = (vars: ThemeVars) =>
  Object.entries(vars)
    .map(([k, v]) => `${k}:${v};`)
    .join("");

// CSS for any element carrying `data-brand-scope`. Follows the app's own
// theme switch: light by default, dark under data-theme="dark" or — until the
// visitor picks explicitly — the OS preference.
export function brandThemeCss(pick: string): string {
  const { light, dark } = buildPalette(pick);
  return (
    `[data-brand-scope]{${decl(light)}}` +
    `:root[data-theme="dark"] [data-brand-scope]{${decl(dark)}}` +
    `@media (prefers-color-scheme: dark){:root:not([data-theme="light"]) [data-brand-scope]{${decl(dark)}}}`
  );
}

// Inline-style variables for a fixed mode (pages that don't follow the theme).
export function brandVars(pick: string, mode: "light" | "dark" = "light"): CSSProperties {
  return buildPalette(pick)[mode] as unknown as CSSProperties;
}
