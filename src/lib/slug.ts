/**
 * A URL-safe id from an English name: "Nutella Crêpe" → "nutella-crepe".
 * Names without Latin letters get `fallback` plus a short random suffix.
 */
export function slugify(name: string, fallback = "item") {
  const slug = name
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60)
    .replace(/-+$/, "");
  return slug || `${fallback}-${Math.random().toString(36).slice(2, 7)}`;
}
