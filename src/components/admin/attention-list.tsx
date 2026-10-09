import Link from "next/link";
import type { Attention } from "@/server/admin/attention";

/** "Needs attention": each item links to where it's sorted out. */
export function AttentionList({ items }: { items: Attention }) {
  if (items.length === 0) return null;
  return (
    <section className="card border-wait/50 p-4">
      <h2 className="text-base font-bold">Needs attention</h2>
      <ul className="mt-2 flex flex-col gap-1.5">
        {items.map((item) => (
          <li key={item.text} className="flex items-center gap-2">
            <span
              className={`size-2 flex-none rounded-full ${item.tone === "bad" ? "bg-bad" : "bg-wait"}`}
            />
            <Link href={item.href} className="hover:text-accent">
              {item.text}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
