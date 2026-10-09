"use client";

import { useState, useTransition } from "react";
import { CopyButton, CopyField } from "@/components/admin/copy-button";
import { Icon } from "@/components/admin/icons";
import type { Choice } from "@/lib/ad-tools/links";
import {
  adName,
  adSetName,
  assetFileName,
  audienceId,
  audienceName,
  audienceScopes,
  audienceTypes,
  campaignName,
  conversionLocations,
  creativeId,
  CREATIVE_NUMBER_MAX,
  ctas,
  fileTypes,
  formats,
  linkTemplates,
  nextAudienceNumber,
  nextCreativeNumber,
  nextCreativeVersion,
  objectives,
  performanceGoals,
  pillars,
  platforms,
  ratios,
  stages,
  yymm,
} from "@/lib/ad-tools/naming";
import { addToRegistry, setRegistryArchived } from "./actions";

export type RegistryRow = {
  id: string;
  code: string;
  name: string;
  note: string;
  archived: boolean;
  created: string;
};

function Pick({
  label,
  value,
  onChange,
  choices,
  empty,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  choices: Choice[];
  empty?: string;
}) {
  return (
    <label className="min-w-0">
      <span className="mb-1 block text-[13px] font-semibold">{label}</span>
      <select className="field" value={value} onChange={(e) => onChange(e.target.value)}>
        {empty !== undefined && <option value="">{empty}</option>}
        {choices.map((c) => (
          <option key={c.value} value={c.value}>
            {c.value}: {c.note}
          </option>
        ))}
      </select>
    </label>
  );
}

function Text({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  hint,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: "text" | "month" | "number";
  hint?: string;
}) {
  return (
    <label className="min-w-0">
      <span className="mb-1 block text-[13px] font-semibold">
        {label} {hint && <span className="font-normal text-muted">({hint})</span>}
      </span>
      <input
        className="field"
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        {...(type === "number" ? { min: 1, max: CREATIVE_NUMBER_MAX } : {})}
      />
    </label>
  );
}

// ─── Ad names ─────────────────────────────────────────────────────────────

export function NamesTool({
  month,
  creatives,
  audiences,
}: {
  /** This month, "2026-10". */
  month: string;
  creatives: RegistryRow[];
  audiences: RegistryRow[];
}) {
  const [d, setD] = useState({
    platform: "fb",
    objective: "sales",
    initiative: "",
    month,
    stage: "prospect",
    location: "website",
    goal: "purchase",
    audience: "",
    version: "1",
    creative: "",
    format: "reel",
    cta: "ordernow",
  });
  const set = (key: keyof typeof d) => (value: string) => setD((v) => ({ ...v, [key]: value }));
  const group = d.platform === "fb" ? "Ad set" : "Ad group";

  const campaign = campaignName({ ...d, month: yymm(d.month) });
  const adSet = adSetName(d);
  const ad = adName(d);

  return (
    <div className="flex flex-col gap-6">
      <section className="card p-5">
        <h2 className="text-base font-bold">Name a campaign, {group.toLowerCase()} and ad</h2>
        <p className="mt-1 text-muted">
          Type these names into the ad platform exactly. Each ad copies them into its link, and
          that’s how the Marketing dashboard puts our orders beside each campaign’s spend.
        </p>

        <h3 className="mt-5 mb-2 font-bold">Campaign</h3>
        <div className="grid gap-3 sm:grid-cols-2 wide:grid-cols-4">
          <Pick
            label="Platform"
            value={d.platform}
            onChange={set("platform")}
            choices={platforms}
          />
          <Pick
            label="Objective"
            value={d.objective}
            onChange={set("objective")}
            choices={objectives}
          />
          <Text
            label="Initiative"
            value={d.initiative}
            onChange={set("initiative")}
            placeholder="launch, ramadan…"
          />
          <Text label="Month" type="month" value={d.month} onChange={set("month")} />
        </div>
        <div className="mt-3">
          <CopyField label="Campaign name" value={campaign} />
        </div>

        <h3 className="mt-6 mb-2 font-bold">{group}</h3>
        <div className="grid gap-3 sm:grid-cols-2 wide:grid-cols-5">
          <Pick label="Stage" value={d.stage} onChange={set("stage")} choices={stages} />
          <Pick
            label="Where results happen"
            value={d.location}
            onChange={set("location")}
            choices={conversionLocations}
          />
          <Pick
            label="Optimise for"
            value={d.goal}
            onChange={set("goal")}
            choices={performanceGoals}
          />
          <Pick
            label="Audience"
            value={d.audience}
            onChange={set("audience")}
            choices={audiences.map((a) => ({ value: a.code, note: a.name || a.note }))}
            empty={audiences.length ? "Pick one…" : "Save audiences first"}
          />
          <Text
            label="Version"
            type="number"
            value={d.version}
            onChange={set("version")}
            hint="a copy to restart learning"
          />
        </div>
        <div className="mt-3">
          <CopyField label={`${group} name`} value={adSet} />
        </div>

        <h3 className="mt-6 mb-2 font-bold">Ad</h3>
        <div className="grid gap-3 sm:grid-cols-3">
          <Pick
            label="Creative"
            value={d.creative}
            onChange={set("creative")}
            choices={creatives.map((c) => ({ value: c.code, note: c.name || "" }))}
            empty={creatives.length ? "Pick one…" : "Save creatives first"}
          />
          <Pick label="Format" value={d.format} onChange={set("format")} choices={formats} />
          <Pick label="Button" value={d.cta} onChange={set("cta")} choices={ctas} />
        </div>
        <div className="mt-3">
          <CopyField label="Ad name" value={ad} />
        </div>
      </section>

      <section className="card p-5">
        <h2 className="text-base font-bold">Tag the ads’ links</h2>
        <p className="mt-1 text-muted">
          Once per ad account: the platform then fills in the names above on every visit, so nothing
          needs typing per ad.
        </p>
        <div className="mt-4 flex flex-col gap-4">
          <CopyField
            label="Meta: Ads Manager → each ad → Tracking → URL parameters"
            value={linkTemplates.meta}
          />
          <CopyField
            label="Google Ads: each campaign → Settings → Campaign URL options → Final URL suffix"
            value={linkTemplates.google(d.platform === "gg" ? campaign : "your-campaign-name")}
          />
          <CopyField
            label="TikTok: each ad → Tracking → URL parameters"
            value={linkTemplates.tiktok}
          />
          <p className="text-[13px] text-muted">
            Google has no name placeholder, so its suffix carries the campaign name typed in: build
            the name above with platform gg and paste this into that campaign. Keep Google’s
            auto-tagging on as well.
          </p>
        </div>
      </section>
    </div>
  );
}

// ─── Registry lists ───────────────────────────────────────────────────────

function RegistryList({
  title,
  rows,
  empty,
}: {
  title: string;
  rows: RegistryRow[];
  empty: string;
}) {
  const [showArchived, setShowArchived] = useState(false);
  const [pending, startTransition] = useTransition();
  const shown = rows.filter((r) => r.archived === showArchived);
  return (
    <section className="card overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-5 py-3">
        <h2 className="text-base font-bold">
          {showArchived ? `Archived ${title.toLowerCase()}` : title}
        </h2>
        <button
          type="button"
          className="text-[13px] font-semibold text-accent"
          onClick={() => setShowArchived((v) => !v)}
        >
          {showArchived ? "Show current" : "Show archived"}
        </button>
      </div>
      {shown.length === 0 ? (
        <p className="px-5 py-4 text-muted">{showArchived ? "Nothing archived." : empty}</p>
      ) : (
        <ul className="divide-y divide-line">
          {shown.map((row) => (
            <li key={row.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 px-5 py-3">
              <div className="min-w-0 flex-[1_1_16rem]">
                <p className="font-mono text-[13px] font-semibold break-all">{row.code}</p>
                <p className="text-[13px] break-words text-muted">
                  {[row.name, row.note, row.created].filter(Boolean).join(" · ")}
                </p>
              </div>
              <div className="flex gap-2">
                <CopyButton value={row.name.includes("_") ? row.name : row.code} />
                <button
                  type="button"
                  disabled={pending}
                  className="btn btn-ghost btn-sm gap-1.5"
                  onClick={() =>
                    startTransition(async () => {
                      await setRegistryArchived(row.id, !row.archived);
                    })
                  }
                >
                  <Icon name="archive" className="size-4" />
                  {row.archived ? "Restore" : "Archive"}
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function SaveRow({
  disabled,
  pending,
  error,
  onSave,
  label,
}: {
  disabled: boolean;
  pending: boolean;
  error: string | null;
  onSave: () => void;
  label: string;
}) {
  return (
    <div className="mt-4 flex flex-wrap items-center gap-3">
      <button
        type="button"
        className="btn btn-primary"
        disabled={disabled || pending}
        onClick={onSave}
      >
        {pending ? "Saving…" : label}
      </button>
      {error && (
        <p role="alert" className="text-[13px] text-bad">
          {error}
        </p>
      )}
    </div>
  );
}

// ─── Creatives ────────────────────────────────────────────────────────────

export function CreativesTool({ month, creatives }: { month: string; creatives: RegistryRow[] }) {
  const [d, setD] = useState({
    month,
    number: "",
    version: "",
    pillar: "product",
    subject: "",
    ext: "mp4",
    label: "",
    note: "",
  });
  const [chosenRatios, setRatios] = useState<string[]>(["9x16", "4x5"]);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const set = (key: keyof typeof d) => (value: string) => setD((v) => ({ ...v, [key]: value }));

  const mm = yymm(d.month);
  const taken = creatives.map((c) => c.code);
  const number = d.number || String(nextCreativeNumber(mm, taken));
  const version = d.version || String(nextCreativeVersion(mm, number, taken));
  const tooBig = Number(number) > CREATIVE_NUMBER_MAX || Number(version) > CREATIVE_NUMBER_MAX;
  const id = creativeId({ month: mm, number, version, pillar: d.pillar, subject: d.subject });
  const files = chosenRatios.map((ratio) => assetFileName({ creative: id, ratio, ext: d.ext }));
  const ready = Boolean(mm && d.subject.trim() && !tooBig);

  const save = () =>
    startTransition(async () => {
      setError(null);
      const result = await addToRegistry({
        kind: "creative",
        code: id,
        name: d.label,
        note: d.note,
        details: {
          month: mm,
          number: Number(number),
          version: Number(version),
          pillar: d.pillar,
          subject: d.subject,
          ratios: chosenRatios,
          ext: d.ext,
        },
      });
      if (result.error) setError(result.error);
      else setD((v) => ({ ...v, number: "", version: "", subject: "", label: "", note: "" }));
    });

  return (
    <div className="flex flex-col gap-6">
      <section className="card p-5">
        <h2 className="text-base font-bold">New creative</h2>
        <p className="mt-1 text-muted">
          A photo or video idea gets one id, shared by every size exported and every ad that uses
          it. A new edit of the same idea is a new version.
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 wide:grid-cols-5">
          <Text label="Month" type="month" value={d.month} onChange={set("month")} />
          <Text
            label="Idea number"
            type="number"
            value={d.number}
            placeholder={number}
            onChange={set("number")}
          />
          <Text
            label="Version"
            type="number"
            value={d.version}
            placeholder={version}
            onChange={set("version")}
          />
          <Pick label="Pillar" value={d.pillar} onChange={set("pillar")} choices={pillars} />
          <Text
            label="What it shows"
            value={d.subject}
            onChange={set("subject")}
            placeholder="lotus crepe"
          />
        </div>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <Text
            label="Label"
            hint="optional"
            value={d.label}
            onChange={set("label")}
            placeholder="Lotus crêpe pour, slow motion"
          />
          <Text
            label="Note"
            hint="optional"
            value={d.note}
            onChange={set("note")}
            placeholder="Shot by…, music…"
          />
        </div>
        <fieldset className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2">
          <legend className="mb-1 text-[13px] font-semibold">Sizes exported</legend>
          {ratios.map((r) => (
            <label key={r.value} className="flex items-center gap-1.5 text-[13px]">
              <input
                type="checkbox"
                checked={chosenRatios.includes(r.value)}
                onChange={(e) =>
                  setRatios((list) =>
                    e.target.checked ? [...list, r.value] : list.filter((x) => x !== r.value),
                  )
                }
              />
              {r.value} <span className="text-muted">({r.note})</span>
            </label>
          ))}
          <select
            className="field w-auto"
            value={d.ext}
            onChange={(e) => set("ext")(e.target.value)}
            aria-label="File type"
          >
            {fileTypes.map((t) => (
              <option key={t} value={t}>
                .{t}
              </option>
            ))}
          </select>
        </fieldset>
        <div className="mt-4 grid gap-3 wide:grid-cols-2">
          <CopyField label="Creative id" value={ready ? id : ""} />
          <CopyField label="File names" value={ready ? files.join("\n") : ""} />
        </div>
        {tooBig && (
          <p className="mt-2 text-[13px] text-bad">Numbers go up to {CREATIVE_NUMBER_MAX}.</p>
        )}
        <SaveRow
          disabled={!ready}
          pending={pending}
          error={error}
          onSave={save}
          label="Save creative"
        />
      </section>
      <RegistryList title="Creatives" rows={creatives} empty="No creatives saved yet." />
    </div>
  );
}

// ─── Audiences ────────────────────────────────────────────────────────────

export function AudiencesTool({ audiences }: { audiences: RegistryRow[] }) {
  const [d, setD] = useState({
    platform: "fb",
    type: "geo",
    number: "",
    descriptor: "",
    scope: "5km",
    note: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const set = (key: keyof typeof d) => (value: string) => setD((v) => ({ ...v, [key]: value }));

  const number =
    d.number ||
    String(
      nextAudienceNumber(
        d.type,
        audiences.map((a) => a.code),
      ),
    );
  const id = audienceId(d.type, number);
  const name = audienceName({ platform: d.platform, id, descriptor: d.descriptor, scope: d.scope });
  const ready = Boolean(id && d.descriptor.trim());

  const save = () =>
    startTransition(async () => {
      setError(null);
      const result = await addToRegistry({
        kind: "audience",
        code: id,
        name,
        note: d.note,
        details: {
          platform: d.platform,
          type: d.type,
          number: Number(number),
          descriptor: d.descriptor,
          scope: d.scope,
        },
      });
      if (result.error) setError(result.error);
      else setD((v) => ({ ...v, number: "", descriptor: "", note: "" }));
    });

  return (
    <div className="flex flex-col gap-6">
      <section className="card p-5">
        <h2 className="text-base font-bold">New audience</h2>
        <p className="mt-1 text-muted">
          Its short id (like geo001) goes into ad set names; the full name is what to call it in the
          platform’s audience list. Write down how it’s defined, so it can be rebuilt.
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 wide:grid-cols-5">
          <Pick
            label="Platform"
            value={d.platform}
            onChange={set("platform")}
            choices={platforms}
          />
          <Pick label="Kind" value={d.type} onChange={set("type")} choices={audienceTypes} />
          <Text
            label="Number"
            type="number"
            value={d.number}
            placeholder={number}
            onChange={set("number")}
          />
          <Text
            label="Describe it"
            value={d.descriptor}
            onChange={set("descriptor")}
            placeholder="tripoli mina"
          />
          <Pick label="Scope" value={d.scope} onChange={set("scope")} choices={audienceScopes} />
        </div>
        <div className="mt-3">
          <Text
            label="How it’s defined"
            hint="optional"
            value={d.note}
            onChange={set("note")}
            placeholder="5 km around the shop, ages 18–45, Arabic and English"
          />
        </div>
        <div className="mt-4 grid gap-3 wide:grid-cols-2">
          <CopyField label="Audience id (for ad set names)" value={ready ? id : ""} />
          <CopyField label="Name in the platform" value={ready ? name : ""} />
        </div>
        <SaveRow
          disabled={!ready}
          pending={pending}
          error={error}
          onSave={save}
          label="Save audience"
        />
      </section>
      <RegistryList title="Audiences" rows={audiences} empty="No audiences saved yet." />
    </div>
  );
}
