import { Fraunces, Pacifico } from "next/font/google";
import localFont from "next/font/local";

// Latin only: every character on the site (incl. ê, –, ·) is in that subset.
export const fraunces = Fraunces({
  subsets: ["latin"],
  axes: ["opsz"],
  variable: "--font-fraunces",
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

// Arabic-only subsets: Latin characters fall through to the next font in each
// stack, so prices and brand names keep Fraunces / Google Sans in Arabic mode.
// No metric-adjusted fallback, or it would claim the Latin range first.
// (next/font needs literal option values, hence the repeated unicode-range.)
export const arabicDisplay = localFont({
  src: "../fonts/baloo-bhaijaan-2-arabic.woff2",
  weight: "400 800",
  variable: "--font-ar-display",
  preload: false,
  adjustFontFallback: false,
  declarations: [
    {
      prop: "unicode-range",
      value: "U+0600-06FF, U+0750-077F, U+0870-08FF, U+FB50-FDFF, U+FE70-FEFC",
    },
  ],
});

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

export const fontVariables = [fraunces, googleSans, pacifico, arabicDisplay, arabicText]
  .map((font) => font.variable)
  .join(" ");
