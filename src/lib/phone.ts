// Lebanese phone numbers. Mobiles are 8 digits starting 7 or 8 (70, 71, 76,
// 78, 79, 81…); the older 03 mobiles and landlines are 7 digits. People type
// them with or without the leading 0, the country code, spaces or dashes.

/** Returns the number in E.164 (+96171234567), or null if it isn't a Lebanese number. */
export function normalisePhone(input: string): string | null {
  let digits = input.replace(/\D/g, "");
  if (digits.startsWith("00961")) digits = digits.slice(5);
  else if (digits.startsWith("961") && digits.length > 8) digits = digits.slice(3);
  if (digits.startsWith("0")) digits = digits.slice(1);
  const valid = /^[1-9]\d{6}$/.test(digits) || /^[78]\d{7}$/.test(digits);
  return valid ? `+961${digits}` : null;
}

/** The local form for display: "71 234 567" or "3 123 456". */
export function formatPhoneLocal(e164: string) {
  const national = e164.replace(/^\+961/, "");
  return national.length === 8
    ? `${national.slice(0, 2)} ${national.slice(2, 5)} ${national.slice(5)}`
    : `${national.slice(0, 1)} ${national.slice(1, 4)} ${national.slice(4)}`;
}
