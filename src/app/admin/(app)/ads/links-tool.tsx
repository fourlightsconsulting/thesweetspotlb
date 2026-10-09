"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { CopyButton, CopyField } from "@/components/admin/copy-button";
import { Drawer } from "@/components/admin/drawer";
import { Help } from "@/components/admin/help";
import { Icon } from "@/components/admin/icons";
import {
  bumpVersion,
  type Destination,
  destinations,
  destinationUrl,
  mediumFor,
  mediums,
  shortLink,
  slug,
  sources,
  suggestLinkId,
  tagValue,
  taggedUrl,
} from "@/lib/ad-tools/links";
import { createLink, setLinkArchived } from "./actions";
import { QrCode } from "./qr-code";

export type LinkRow = {
  id: string;
  utmId: string;
  label: string;
  url: string;
  destination: string;
  source: string;
  medium: string;
  campaign: string;
  content: string;
  term: string;
  archived: boolean;
  created: string;
  visits: number;
  orders: number;
  sales: string;
};

type Draft = {
  destination: Destination;
  lang: "en" | "ar";
  item: string;
  custom: string;
  source: string;
  medium: string;
  campaign: string;
  content: string;
  term: string;
  id: string;
  label: string;
};

const blank: Draft = {
  destination: "order",
  lang: "en",
  item: "",
  custom: "",
  source: "",
  medium: "social",
  campaign: "",
  content: "",
  term: "",
  id: "",
  label: "",
};

/** The page a saved link goes to, read back into the builder's choices. */
function draftDestination(siteUrl: string, url: string): Partial<Draft> {
  try {
    const u = new URL(url);
    const [lang, page] = u.pathname.split("/").filter(Boolean);
    if (u.origin === new URL(siteUrl).origin && (lang === "en" || lang === "ar")) {
      const item = u.searchParams.get("item");
      if (page === "order" && item) return { destination: "item", lang, item };
      if (page === "order") return { destination: "order", lang };
      if (page === "about") return { destination: "about", lang };
      if (!page) return { destination: "home", lang };
    }
  } catch {
    // Not an address: treat it as another one below.
  }
  return { destination: "custom", custom: url };
}

export function LinksTool({
  links,
  items,
  siteUrl,
  showArchived,
}: {
  links: LinkRow[];
  items: { id: string; name: string }[];
  siteUrl: string;
  showArchived: boolean;
}) {
  const [draft, setDraft] = useState<Draft>(blank);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [open, setOpen] = useState<LinkRow | null>(null);
  const [justSaved, setJustSaved] = useState<string | null>(null);

  const set = <K extends keyof Draft>(key: K, value: Draft[K]) =>
    setDraft((d) => ({ ...d, [key]: value }));
  // The medium follows the source until someone picks one.
  const [mediumPicked, setMediumPicked] = useState(false);
  const medium = mediumPicked ? draft.medium : mediumFor(draft.source);

  const destination = destinationUrl(siteUrl, draft.destination, draft.lang, {
    item: draft.item,
    custom: draft.custom,
  });
  const suggested = suggestLinkId(
    draft.campaign,
    draft.source,
    links.map((l) => l.utmId),
  );
  const id = slug(draft.id, 80) || suggested;
  const tags = {
    source: slug(draft.source, 60),
    medium: slug(medium, 40),
    campaign: tagValue(draft.campaign),
    content: tagValue(draft.content),
    term: tagValue(draft.term),
    id,
  };
  const full = destination ? taggedUrl(destination, tags) : "";
  const ready = Boolean(full && tags.source && tags.medium && tags.campaign);
  const shown = links.filter((l) => l.archived === showArchived);
  const opened = open ?? (justSaved ? (links.find((l) => l.utmId === justSaved) ?? null) : null);

  const save = () =>
    startTransition(async () => {
      setError(null);
      const result = await createLink({
        label: draft.label,
        destination,
        source: draft.source,
        medium,
        campaign: draft.campaign,
        content: draft.content,
        term: draft.term,
        id,
      });
      if (result.error) setError(result.error);
      else {
        setJustSaved(id);
        setDraft(blank);
        setMediumPicked(false);
      }
    });

  const nextVersion = (link: LinkRow) => {
    setMediumPicked(true);
    setDraft({
      ...blank,
      ...draftDestination(siteUrl, link.destination),
      source: link.source,
      medium: link.medium,
      campaign: link.campaign,
      content: bumpVersion(link.content),
      term: link.term,
      label: link.label,
    });
    document.getElementById("link-source")?.focus();
  };

  return (
    <div className="flex flex-col gap-6">
      <section className="card p-5">
        <h2 className="text-base font-bold">
          New tracking link
          <Help>
            For posts, your bio, WhatsApp broadcasts and anything printed: its visits and orders
            show under its campaign in the reports. For Meta, Google and TikTok ads, use Ad names
            instead. Save a link before using it: its short address works only once saved.
          </Help>
        </h2>
        <div className="mt-4 grid gap-4 wide:grid-cols-2">
          <div className="flex flex-col gap-3">
            <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
              <label>
                <span className="mb-1 block text-[13px] font-semibold">Where it goes</span>
                <select
                  className="field"
                  value={draft.destination}
                  onChange={(e) => set("destination", e.target.value as Destination)}
                >
                  {destinations.map((d) => (
                    <option key={d.value} value={d.value}>
                      {d.label}
                    </option>
                  ))}
                </select>
              </label>
              {draft.destination !== "custom" && (
                <label>
                  <span className="mb-1 block text-[13px] font-semibold">Language</span>
                  <select
                    className="field"
                    value={draft.lang}
                    onChange={(e) => set("lang", e.target.value as "en" | "ar")}
                  >
                    <option value="en">English</option>
                    <option value="ar">Arabic</option>
                  </select>
                </label>
              )}
            </div>
            {draft.destination === "item" && (
              <label>
                <span className="mb-1 block text-[13px] font-semibold">Item</span>
                <select
                  className="field"
                  value={draft.item}
                  onChange={(e) => set("item", e.target.value)}
                >
                  <option value="">Pick an item…</option>
                  {items.map((i) => (
                    <option key={i.id} value={i.id}>
                      {i.name}
                    </option>
                  ))}
                </select>
              </label>
            )}
            {draft.destination === "custom" && (
              <label>
                <span className="mb-1 block text-[13px] font-semibold">Address</span>
                <input
                  className="field"
                  type="url"
                  placeholder="https://"
                  value={draft.custom}
                  onChange={(e) => set("custom", e.target.value)}
                />
              </label>
            )}
            <div className="grid gap-3 sm:grid-cols-2">
              <label>
                <span className="mb-1 block text-[13px] font-semibold">Source</span>
                <input
                  id="link-source"
                  className="field"
                  list="link-sources"
                  placeholder="instagram, flyer…"
                  value={draft.source}
                  onChange={(e) => set("source", e.target.value)}
                />
                <datalist id="link-sources">
                  {sources.map((s) => (
                    <option key={s} value={s} />
                  ))}
                </datalist>
              </label>
              <label>
                <span className="mb-1 block text-[13px] font-semibold">Medium</span>
                <select
                  className="field"
                  value={medium}
                  onChange={(e) => {
                    setMediumPicked(true);
                    set("medium", e.target.value);
                  }}
                >
                  {mediums.map((m) => (
                    <option key={m.value} value={m.value}>
                      {m.value}: {m.note}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <label>
              <span className="mb-1 block text-[13px] font-semibold">Campaign</span>
              <input
                className="field"
                placeholder="launch, ramadan-2027, back-to-school…"
                value={draft.campaign}
                onChange={(e) => set("campaign", e.target.value)}
              />
            </label>
            <div className="grid gap-3 sm:grid-cols-2">
              <label>
                <span className="mb-1 block text-[13px] font-semibold">
                  Content <span className="font-normal text-muted">(optional)</span>
                </span>
                <input
                  className="field"
                  placeholder="story-1, table-tent-a5…"
                  value={draft.content}
                  onChange={(e) => set("content", e.target.value)}
                />
              </label>
              <label>
                <span className="mb-1 block text-[13px] font-semibold">
                  Label <span className="font-normal text-muted">(for you)</span>
                </span>
                <input
                  className="field"
                  maxLength={120}
                  placeholder="Table tents, Mina"
                  value={draft.label}
                  onChange={(e) => set("label", e.target.value)}
                />
              </label>
            </div>
            <label>
              <span className="mb-1 block text-[13px] font-semibold">
                Link id <span className="font-normal text-muted">(its short address)</span>
              </span>
              <input
                className="field"
                placeholder={suggested}
                value={draft.id}
                onChange={(e) => set("id", e.target.value)}
              />
            </label>
          </div>

          <div className="flex min-w-0 flex-col gap-3">
            <CopyField
              label="Short link (for QR codes and bios)"
              value={ready ? shortLink(siteUrl, id) : ""}
            />
            <CopyField label="Full link" value={ready ? full : ""} />
            <div className="mt-auto flex flex-wrap items-center gap-3">
              <button
                type="button"
                className="btn btn-primary"
                disabled={!ready || pending}
                onClick={save}
              >
                {pending ? "Saving…" : "Save link"}
              </button>
              {error && (
                <p role="alert" className="w-full text-[13px] text-bad">
                  {error}
                </p>
              )}
            </div>
          </div>
        </div>
      </section>

      <section className="card overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-5 py-3">
          <h2 className="text-base font-bold">{showArchived ? "Archived links" : "Saved links"}</h2>
          <Link
            href={showArchived ? "/admin/ads" : "/admin/ads?archived=1"}
            className="text-[13px] font-semibold text-accent"
          >
            {showArchived ? "Show saved links" : "Show archived"}
          </Link>
        </div>
        {shown.length === 0 ? (
          <p className="px-5 py-4 text-muted">
            {showArchived ? "Nothing archived." : "No links yet. Build one above."}
          </p>
        ) : (
          <ul className="divide-y divide-line">
            {shown.map((link) => (
              <li key={link.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 px-5 py-3">
                <button
                  type="button"
                  onClick={() => setOpen(link)}
                  className="min-w-0 flex-[1_1_16rem] text-start"
                >
                  <span className="block font-semibold">{link.label || link.campaign}</span>
                  <span className="block truncate text-[13px] text-muted">
                    {[link.source, link.medium, link.campaign, link.content]
                      .filter(Boolean)
                      .join(" · ")}{" "}
                    · /l/{link.utmId}
                  </span>
                </button>
                <span className="text-[13px] text-muted tabular-nums">
                  {link.visits} {link.visits === 1 ? "visit" : "visits"} · {link.orders}{" "}
                  {link.orders === 1 ? "order" : "orders"} · {link.sales}
                </span>
                <div className="flex flex-wrap gap-2">
                  <CopyButton value={shortLink(siteUrl, link.utmId)} label="Short link" />
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm gap-1.5"
                    onClick={() => setOpen(link)}
                  >
                    <Icon name="qr" className="size-4" />
                    QR
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <Drawer
        open={opened !== null}
        onClose={() => {
          setOpen(null);
          setJustSaved(null);
        }}
        title={opened?.label || opened?.campaign || ""}
        subtitle={
          justSaved && !open ? "Saved. Here’s its QR code." : `Made ${opened?.created ?? ""}`
        }
        footer={
          opened && (
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => {
                  nextVersion(opened);
                  setOpen(null);
                  setJustSaved(null);
                }}
              >
                New version
              </button>
              <button
                type="button"
                className="btn btn-ghost gap-1.5"
                onClick={() =>
                  startTransition(async () => {
                    const result = await setLinkArchived(opened.id, !opened.archived);
                    if (!result.error) {
                      setOpen(null);
                      setJustSaved(null);
                    }
                  })
                }
              >
                <Icon name="archive" className="size-4" />
                {opened.archived ? "Restore" : "Archive"}
              </button>
            </div>
          )
        }
      >
        {opened && (
          <div className="flex flex-col gap-5">
            <QrCode value={shortLink(siteUrl, opened.utmId)} name={`qr-${opened.utmId}`} />
            <CopyField label="Short link" value={shortLink(siteUrl, opened.utmId)} />
            <CopyField label="Full link" value={opened.url} />
            <dl className="grid grid-cols-2 gap-3 text-[13px]">
              {(
                [
                  ["Source", opened.source],
                  ["Medium", opened.medium],
                  ["Campaign", opened.campaign],
                  ["Content", opened.content || "—"],
                  ["Visits", String(opened.visits)],
                  ["Orders", `${opened.orders} (${opened.sales})`],
                ] as const
              ).map(([label, value]) => (
                <div key={label} className="min-w-0">
                  <dt className="text-muted">{label}</dt>
                  <dd className="break-words">{value}</dd>
                </div>
              ))}
            </dl>
          </div>
        )}
      </Drawer>
    </div>
  );
}
