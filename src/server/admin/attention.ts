// "Needs attention": the short list on the admin home and the Health page,
// and the badge on Health's menu link. The counts come from the database's
// health_attention(); the rest from settings this module is handed, so it
// stays plain logic.

export type AttentionItem = { text: string; href: string; tone: "bad" | "wait" };
export type Attention = AttentionItem[];

export type AttentionCounts = {
  waiting: number;
  alerts_failed: number;
  alerts_stuck: number;
  errors: number;
  jobs_failed: string[];
  cron_failed: string[];
  relay_orders: number;
  database_bytes: number;
};

export type AttentionContext = {
  ordering: "hours" | "open" | "paused";
  firstParty: boolean;
  /** WhatsApp alerts can send (its settings are set). */
  whatsapp: boolean;
  /** Meta's Conversions API is set up. */
  metaCapi: boolean;
};

export const jobNames: Record<string, string> = {
  "meta-ads": "Meta ads import",
  social: "Instagram & Facebook import",
  google: "Google import",
  sweep: "retries job",
};

/** The free plan's database limit; past it the database goes read-only. */
export const DATABASE_LIMIT_BYTES = 500 * 1024 * 1024;

const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

export function attentionItems(c: AttentionCounts, ctx: AttentionContext): Attention {
  const items: Attention = [];
  if (c.waiting)
    items.push({
      text: `${plural(c.waiting, "order")} waiting over 10 minutes to be started`,
      href: "/admin/orders",
      tone: "bad",
    });
  if (c.alerts_failed)
    items.push({
      text: `${plural(c.alerts_failed, "WhatsApp alert")} didn’t send`,
      href: "/admin/store",
      tone: "bad",
    });
  if (c.alerts_stuck && ctx.whatsapp)
    items.push({
      text: `${plural(c.alerts_stuck, "WhatsApp alert")} still waiting to send`,
      href: "/admin/health",
      tone: "bad",
    });
  if (c.errors)
    items.push({
      text: `${plural(c.errors, "problem")} for visitors on the website in the last 24 hours`,
      href: "/admin/health?tab=problems&range=24h",
      tone: "bad",
    });
  for (const job of c.cron_failed)
    items.push({
      text: `The scheduled “${job}” job failed`,
      href: "/admin/health",
      tone: "bad",
    });
  for (const job of c.jobs_failed)
    items.push({
      text: `The ${jobNames[job] ?? job} failed last time`,
      href: "/admin/health?tab=connections",
      tone: "wait",
    });
  if (c.relay_orders && ctx.metaCapi)
    items.push({
      text: `${plural(c.relay_orders, "order")} haven’t reached Meta yet`,
      href: "/admin/health",
      tone: "wait",
    });
  if (ctx.ordering === "open")
    items.push({
      text: "Online ordering is open whatever the hours",
      href: "/admin/store",
      tone: "wait",
    });
  if (ctx.ordering === "paused")
    items.push({ text: "Online ordering is paused", href: "/admin/store", tone: "wait" });
  if (!ctx.firstParty)
    items.push({ text: "Website analytics is switched off", href: "/admin/site", tone: "wait" });
  if (c.database_bytes > DATABASE_LIMIT_BYTES * 0.8)
    items.push({
      text: `The database is at ${Math.round(c.database_bytes / 1024 / 1024)} MB of the free plan’s 500 MB`,
      href: "/admin/site",
      tone: "bad",
    });
  return items;
}
