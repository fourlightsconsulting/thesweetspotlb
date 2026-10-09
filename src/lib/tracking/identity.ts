// Customer details for the ad platforms' matching (Meta advanced matching,
// Google enhanced conversions), normalised the same way in the browser and
// on the server: Meta and Google hash exactly what they're given, so " 03
// 123 456" and "9613123456" would be two different people.
//
// The website only knows a customer's name and phone, from checkout.

const COUNTRY_CODE = "961";

/** Phone digits with the country code, no "+": "96171234567". Empty if unusable. */
export function phoneDigits(value: string | null | undefined) {
  const digits = (value ?? "").replace(/\D/g, "");
  if (digits.length < 6 || digits.length > 15) return "";
  if (digits.startsWith(COUNTRY_CODE)) return digits;
  if (digits.startsWith("00")) return digits.slice(2);
  return `${COUNTRY_CODE}${digits.replace(/^0+/, "")}`;
}

/**
 * Letters only, lowercased: Latin, Latin accents and Arabic (an Arabic name
 * stripped to [a-z] would be lost entirely).
 */
export const letters = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-zÀ-ɏ؀-ۿ]/g, "");

/** "Ali Hassan" → first "ali", last "hassan"; one word is a first name. */
export function nameParts(fullName: string | null | undefined) {
  const parts = (fullName ?? "").trim().split(/\s+/).filter(Boolean);
  return {
    first: letters(parts[0] ?? ""),
    last: letters(parts.slice(1).join("")),
  };
}

export async function sha256(value: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");
}
