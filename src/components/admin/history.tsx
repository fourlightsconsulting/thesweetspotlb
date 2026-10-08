import { money, when } from "./format";

// Change history from the audit log, in words: "Price $5.00 → $5.50".

export type HistoryEntry = {
  at: string;
  actor_name: string;
  table_name: string;
  action: string;
  changes: unknown;
};

const yesNo = (on: string, off: string) => (value: unknown) => (value ? on : off);

const columns: Record<string, (from: unknown, to: unknown) => string | null> = {
  price_cents: (from, to) => `Price ${money(Number(from))} → ${money(Number(to))}`,
  name_en: (_, to) => `Renamed to “${to}”`,
  name_ar: () => "Arabic name edited",
  description_en: () => "Description edited",
  description_ar: () => "Arabic description edited",
  is_available: (_, to) => yesNo("Back in stock", "Marked sold out")(to),
  is_active: (_, to) => yesNo("Shown on the menu", "Hidden from the menu")(to),
  orderable_online: (_, to) => yesNo("Orderable online", "In the shop only")(to),
  image_path: (_, to) => (to ? "New photo" : "Photo removed"),
  tag: (_, to) => (to ? `Tagged ${to}` : "Tag removed"),
  category_id: () => "Moved to another category",
  parent_id: () => "Moved under another category",
  min_select: () => "Rule changed",
  max_select: () => "Rule changed",
  default_options: () => "Preselected choices changed",
  sort_order: () => null,
};

/** One audit row as short sentences. */
export function describeEntry(entry: HistoryEntry): string[] {
  if (entry.action === "insert") return ["Added"];
  if (entry.action === "delete") return ["Deleted"];
  const changes = (entry.changes ?? {}) as Record<string, [unknown, unknown]>;
  const lines = Object.entries(changes)
    .map(([column, [from, to]]) =>
      (columns[column] ?? (() => `${column.replace(/_/g, " ")} changed`))(from, to),
    )
    .filter((line): line is string => line !== null);
  return [...new Set(lines)];
}

/** Recent changes, newest first. */
export function History({
  entries,
  empty = "No changes yet.",
}: {
  entries: HistoryEntry[];
  empty?: string;
}) {
  const rows = entries
    .map((entry) => ({ entry, lines: describeEntry(entry) }))
    .filter((row) => row.lines.length > 0);
  if (rows.length === 0) return <p className="text-muted">{empty}</p>;
  return (
    <ol className="flex flex-col divide-y divide-line">
      {rows.map(({ entry, lines }, i) => (
        <li
          key={`${entry.at}-${i}`}
          className="flex flex-wrap justify-between gap-x-4 gap-y-0.5 py-2 text-[13px]"
        >
          <span>{lines.join(" · ")}</span>
          <span className="text-muted">
            {entry.actor_name} · {when(entry.at)}
          </span>
        </li>
      ))}
    </ol>
  );
}
