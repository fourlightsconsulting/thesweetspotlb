import { Pacifico } from "next/font/google";
import localFont from "next/font/local";

// Self-hosted Fraunces with its "soft" axis fixed at 100: rounder terminals that
// suit a dessert brand, and 62 KB instead of 67 KB for the default sharp cut.
// Optical size and weight stay variable. Latin only: every character on the
// site (incl. ê, –, ·) is in that subset.
// Source: fonts.googleapis.com/css2?family=Fraunces:opsz,wght,SOFT@9..144,100..900,100
export const fraunces = localFont({
  src: "../fonts/fraunces-soft-latin.woff2",
  weight: "100 900",
  variable: "--font-fraunces",
  adjustFontFallback: "Times New Roman",
});

// Self-hosted Google Sans Flex, clipped to the weights the UI uses (400–700):
// 36 KB instead of 173 KB for the full variable font.
// Source: fonts.googleapis.com/css2?family=Google+Sans+Flex:wght@400..700
export const googleSans = localFont({
  src: "../fonts/google-sans-flex-latin.woff2",
  weight: "400 700",
  variable: "--font-google-sans",
});

export const pacifico = Pacifico({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-pacifico",
});

// The website's Arabic face: IBM Plex Sans Arabic, calm and easy to read for
// every age. Self-hosted Arabic-only subsets (Google's own files), so Latin
// characters (prices, brand names) fall through to Fraunces / Google Sans; no
// metric-adjusted fallback, or it would claim the Latin range first.
// (next/font needs literal option values, hence the repeated unicode-range.)
export const arabic = localFont({
  src: [
    { path: "../fonts/ibm-plex-sans-arabic-400-arabic.woff2", weight: "400" },
    { path: "../fonts/ibm-plex-sans-arabic-500-arabic.woff2", weight: "500" },
    { path: "../fonts/ibm-plex-sans-arabic-600-arabic.woff2", weight: "600" },
    { path: "../fonts/ibm-plex-sans-arabic-700-arabic.woff2", weight: "700" },
  ],
  variable: "--font-plex-ar",
  preload: false,
  adjustFontFallback: false,
  declarations: [
    {
      prop: "unicode-range",
      value: "U+0600-06FF, U+0750-077F, U+0870-08FF, U+FB50-FDFF, U+FE70-FEFC",
    },
  ],
});

// The admin's Arabic (Readex Pro), Arabic-only subset as above.
export const arabicText = localFont({
  src: "../fonts/readex-pro-arabic.woff2",
  weight: "160 700",
  variable: "--font-ar-text",
  preload: false,
  adjustFontFallback: false,
  declarations: [
    {
      prop: "unicode-range",
      value: "U+0600-06FF, U+0750-077F, U+0870-08FF, U+FB50-FDFF, U+FE70-FEFC",
    },
  ],
});

export const fontVariables = [fraunces, googleSans, pacifico, arabic]
  .map((font) => font.variable)
  .join(" ");
