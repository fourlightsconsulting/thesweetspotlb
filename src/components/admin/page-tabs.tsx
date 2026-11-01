import Link from "next/link";

// A page's tabs: one look everywhere, as links (the tab is in the address).

export const tabClass =
  "-mb-px border-b-2 border-transparent px-3 py-2 font-semibold whitespace-nowrap text-muted hover:text-ink aria-[current=page]:border-accent aria-[current=page]:text-ink";

export const tabBarClass = "mb-5 flex gap-1 overflow-x-auto border-b border-line";

export function PageTabs({
  label,
  tabs,
  current,
}: {
  label: string;
  tabs: readonly { href: string; label: string }[];
  /** The current tab's href. */
  current: string;
}) {
  return (
    <nav aria-label={label} className={tabBarClass}>
      {tabs.map((tab) => (
        <Link
          key={tab.href}
          href={tab.href}
          aria-current={tab.href === current ? "page" : undefined}
          className={tabClass}
        >
          {tab.label}
        </Link>
      ))}
    </nav>
  );
}
