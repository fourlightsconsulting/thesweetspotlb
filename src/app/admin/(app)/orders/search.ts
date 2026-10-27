import { normalisePhone } from "@/lib/phone";

type OrderSearch =
  | { kind: "number"; value: number }
  | { kind: "phone"; value: string }
  | { kind: "partialPhone"; value: string }
  | { kind: "name"; value: string };

/** Full phone numbers take precedence; TSS- always explicitly means an order. */
export function orderSearch(q: string): OrderSearch {
  const explicit = q.match(/^tss-?(\d{4,})$/i);
  if (explicit) return { kind: "number", value: Number(explicit[1]) };

  const numeric = /^[\d\s+()-]+$/.test(q);
  const phone = numeric ? normalisePhone(q) : null;
  if (phone) return { kind: "phone", value: phone };

  if (/^\d{4,}$/.test(q)) return { kind: "number", value: Number(q) };
  const digits = q.replace(/\D/g, "");
  if (numeric && digits.length >= 3)
    return { kind: "partialPhone", value: digits.replace(/^(00961|961|0)/, "") };
  return { kind: "name", value: q.replace(/[%_,()]/g, " ") };
}
