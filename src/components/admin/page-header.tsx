import type { ReactNode } from "react";
import { Help } from "./help";

/**
 * A page's title row: a small label above it if wanted, the title (with a
 * "?" when it needs explaining), facts about what's shown (an order's status,
 * a customer's phone) and actions.
 */
export function PageHeader({
  eyebrow,
  title,
  description,
  help,
  actions,
}: {
  eyebrow?: string;
  title: string;
  description?: ReactNode;
  help?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
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
