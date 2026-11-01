import Link from "next/link";
import type { ReactNode } from "react";
import { Help } from "./help";
import { Icon } from "./icons";

/**
 * A page's title row: a small label above it if wanted, the title (with a
 * "?" when it needs explaining), facts about what's shown (an order's status,
 * a customer's phone) and actions. `breadcrumbs` lead back up from a detail page.
 */
export function PageHeader({
  eyebrow,
  breadcrumbs,
  title,
  description,
  help,
  actions,
}: {
  eyebrow?: string;
  breadcrumbs?: { href: string; label: string }[];
  title: string;
  description?: ReactNode;
  help?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        {breadcrumbs && (
          <nav aria-label="Back to" className="mb-1 flex flex-wrap items-center gap-1 text-[13px]">
            {breadcrumbs.map((crumb, index) => (
              <span key={crumb.href} className="flex items-center gap-1">
                {index > 0 && <Icon name="chevron" className="size-3 text-muted" />}
                <Link href={crumb.href} className="font-semibold text-accent hover:underline">
                  {crumb.label}
                </Link>
              </span>
            ))}
          </nav>
        )}
        {eyebrow && (
          <p className="mb-1 text-[12px] leading-4 font-bold tracking-[0.12em] text-accent uppercase">
            {eyebrow}
          </p>
        )}
        <h1 className="text-2xl leading-8 font-bold tracking-[-0.01em]">
          {title}
          {help && <Help>{help}</Help>}
        </h1>
        {description && <p className="mt-1 max-w-[70ch] text-muted">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}
