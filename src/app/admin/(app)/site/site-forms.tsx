"use client";

import { useState, useTransition } from "react";
import { Icon } from "@/components/admin/icons";
import { Switch } from "@/components/admin/switch";
import type { HomeTicker, WelcomePopup } from "@/lib/site-settings";
import { savePopup, saveTicker } from "./actions";

type Status = { tone: "good" | "bad"; text: string } | null;

function useSave(action: () => Promise<{ error: string | null }>) {
  const [saving, startSaving] = useTransition();
  const [status, setStatus] = useState<Status>(null);
  const save = () =>
    startSaving(async () => {
      const result = await action();
      setStatus(
        result.error ? { tone: "bad", text: result.error } : { tone: "good", text: "Saved" },
      );
    });
  return { saving, status, save, clear: () => setStatus(null) };
}

function StatusLine({ status }: { status: Status }) {
  if (!status) return null;
  return (
    <p
      role={status.tone === "bad" ? "alert" : "status"}
      className={`text-[13px] ${status.tone === "bad" ? "text-bad" : "font-semibold text-good"}`}
    >
      {status.text}
    </p>
  );
}

/** A pair of English and Arabic inputs. */
function Localized({
  id,
  label,
  value,
  onChange,
  max,
  multiline = false,
}: {
  id: string;
  label: string;
  value: { en: string; ar: string };
  onChange: (value: { en: string; ar: string }) => void;
  max: number;
  multiline?: boolean;
}) {
  const Field = multiline ? "textarea" : "input";
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {(["en", "ar"] as const).map((lang) => (
        <div key={lang}>
          <label htmlFor={`${id}-${lang}`} className="label">
            {lang === "en" ? label : `${label} in Arabic`}
          </label>
          <Field
            id={`${id}-${lang}`}
            value={value[lang]}
            maxLength={max}
            rows={multiline ? 3 : undefined}
            onChange={(e) => onChange({ ...value, [lang]: e.target.value })}
            lang={lang}
            dir={lang === "ar" ? "rtl" : undefined}
            className="field"
          />
        </div>
      ))}
    </div>
  );
}

export function TickerForm({ initial }: { initial: HomeTicker }) {
  const [ticker, setTicker] = useState(initial);
  const { saving, status, save } = useSave(() => saveTicker(ticker));
  const phrases = ticker.phrases;
  const setPhrases = (next: HomeTicker["phrases"]) => setTicker({ ...ticker, phrases: next });

  return (
    <section className="card p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-bold">Home ticker</h2>
          <p className="mt-1 text-muted">
            The scrolling band under the home page’s photo. Short phrases read best.
          </p>
        </div>
        <label className="flex items-center gap-2">
          <Switch
            checked={ticker.enabled}
            onChange={(enabled) => setTicker({ ...ticker, enabled })}
            label="Show the ticker"
          />
          {ticker.enabled ? "Showing" : "Hidden"}
        </label>
      </div>

      <ol className="mt-4 flex flex-col gap-2">
        {phrases.map((phrase, i) => (
          <li key={i} className="grid grid-cols-[1fr_auto] gap-2 sm:grid-cols-[1fr_1fr_auto]">
            <input
              value={phrase.en}
              maxLength={40}
              onChange={(e) =>
                setPhrases(phrases.map((p, j) => (j === i ? { ...p, en: e.target.value } : p)))
              }
              aria-label={`Phrase ${i + 1}`}
              className="field"
            />
            <input
              value={phrase.ar}
              maxLength={40}
              onChange={(e) =>
                setPhrases(phrases.map((p, j) => (j === i ? { ...p, ar: e.target.value } : p)))
              }
              aria-label={`Phrase ${i + 1} in Arabic`}
              lang="ar"
              dir="rtl"
              className="field max-sm:order-3 max-sm:col-span-2"
            />
            <div className="flex">
              <button
                type="button"
                aria-label="Move up"
                disabled={i === 0}
                onClick={() => {
                  const next = [...phrases];
                  [next[i - 1], next[i]] = [next[i], next[i - 1]];
                  setPhrases(next);
                }}
                className="btn btn-ghost btn-sm px-1.5"
              >
                <Icon name="up" className="size-4" />
              </button>
              <button
                type="button"
                aria-label={`Remove phrase ${i + 1}`}
                disabled={phrases.length === 1}
                onClick={() => setPhrases(phrases.filter((_, j) => j !== i))}
                className="btn btn-ghost btn-sm px-1.5 text-bad"
              >
                <Icon name="trash" className="size-4" />
              </button>
            </div>
          </li>
        ))}
      </ol>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button
          type="button"
          disabled={phrases.length >= 8}
          onClick={() => setPhrases([...phrases, { en: "", ar: "" }])}
          className="btn btn-secondary"
        >
          <Icon name="plus" className="size-4" />
          Add a phrase
        </button>
        <button type="button" onClick={save} disabled={saving} className="btn btn-primary">
          {saving ? "Saving…" : "Save ticker"}
        </button>
        <StatusLine status={status} />
      </div>
    </section>
  );
}

type Target = "order" | "item" | "category" | "link";

const targetKind = (target: string): Target =>
  target === "order"
    ? "order"
    : target.startsWith("item:")
      ? "item"
      : target.startsWith("category:")
        ? "category"
        : "link";

export function PopupForm({
  initial,
  items,
  categories,
  codes,
  previewUrl,
}: {
  initial: WelcomePopup;
  items: { slug: string; name: string }[];
  categories: { slug: string; name: string }[];
  codes: string[];
  previewUrl: string;
}) {
  const [popup, setPopup] = useState(initial);
  const [kind, setKind] = useState<Target>(targetKind(initial.cta.target));
  const { saving, status, save } = useSave(() => savePopup(popup));
  const set = (patch: Partial<WelcomePopup>) => setPopup((p) => ({ ...p, ...patch }));
  const setTarget = (target: string) =>
    set({ cta: { ...popup.cta, target } as WelcomePopup["cta"] });
  const targetValue = popup.cta.target.replace(/^(item|category):/, "");

  return (
    <section className="card p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-bold">Welcome popup</h2>
          <p className="mt-1 text-muted">
            An offer shown once to each visitor, a few seconds after they arrive. Never during
            checkout.
          </p>
        </div>
        <label className="flex items-center gap-2">
          <Switch
            checked={popup.enabled}
            onChange={(enabled) => set({ enabled })}
            label="Show the popup"
          />
          {popup.enabled ? "On" : "Off"}
        </label>
      </div>

      <div className="mt-4 flex flex-col gap-4">
        <Localized
          id="popup-title"
          label="Title"
          value={popup.title}
          onChange={(title) => set({ title })}
          max={70}
        />
        <Localized
          id="popup-body"
          label="Message"
          value={popup.body}
          onChange={(body) => set({ body })}
          max={240}
          multiline
        />
        <div className="max-w-xs">
          <label htmlFor="popup-code" className="label">
            Code <span className="font-normal text-muted">(optional, with a copy button)</span>
          </label>
          <input
            id="popup-code"
            list="popup-codes"
            value={popup.code ?? ""}
            onChange={(e) => set({ code: e.target.value.toUpperCase().replace(/\s/g, "") || null })}
            maxLength={24}
            className="field font-mono uppercase"
          />
          <datalist id="popup-codes">
            {codes.map((c) => (
              <option key={c} value={c} />
            ))}
          </datalist>
        </div>
        <Localized
          id="popup-cta"
          label="Button"
          value={popup.cta.label}
          onChange={(label) => set({ cta: { ...popup.cta, label } })}
          max={30}
        />
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label htmlFor="popup-target" className="label">
              The button goes to
            </label>
            <select
              id="popup-target"
              value={kind}
              onChange={(e) => {
                const next = e.target.value as Target;
                setKind(next);
                setTarget(
                  next === "order"
                    ? "order"
                    : next === "item"
                      ? `item:${items[0]?.slug ?? ""}`
                      : next === "category"
                        ? `category:${categories[0]?.slug ?? ""}`
                        : "https://",
                );
              }}
              className="field"
            >
              <option value="order">The order page</option>
              <option value="item">An item</option>
              <option value="category">A category</option>
              <option value="link">Another page (a link)</option>
            </select>
          </div>
          {kind === "item" && (
            <div>
              <label htmlFor="popup-item" className="label">
                Item
              </label>
              <select
                id="popup-item"
                value={targetValue}
                onChange={(e) => setTarget(`item:${e.target.value}`)}
                className="field"
              >
                {items.map((i) => (
                  <option key={i.slug} value={i.slug}>
                    {i.name}
                  </option>
                ))}
              </select>
            </div>
          )}
          {kind === "category" && (
            <div>
              <label htmlFor="popup-category" className="label">
                Category
              </label>
              <select
                id="popup-category"
                value={targetValue}
                onChange={(e) => setTarget(`category:${e.target.value}`)}
                className="field"
              >
                {categories.map((c) => (
                  <option key={c.slug} value={c.slug}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          )}
          {kind === "link" && (
            <div>
              <label htmlFor="popup-link" className="label">
                Link
              </label>
              <input
                id="popup-link"
                type="url"
                value={popup.cta.target}
                onChange={(e) => setTarget(e.target.value)}
                placeholder="https://www.instagram.com/…"
                className="field"
              />
            </div>
          )}
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <div>
            <label htmlFor="popup-delay" className="label">
              Appears after (seconds)
            </label>
            <input
              id="popup-delay"
              type="number"
              min={0}
              max={60}
              value={popup.delay_seconds}
              onChange={(e) => set({ delay_seconds: Number(e.target.value) })}
              className="field"
            />
          </div>
          <div>
            <label htmlFor="popup-repeat" className="label">
              Shown again after (days)
            </label>
            <input
              id="popup-repeat"
              type="number"
              min={1}
              max={365}
              value={popup.repeat_after_days}
              onChange={(e) => set({ repeat_after_days: Number(e.target.value) })}
              className="field"
            />
          </div>
          <div>
            <label htmlFor="popup-pages" className="label">
              On
            </label>
            <select
              id="popup-pages"
              value={popup.pages}
              onChange={(e) => set({ pages: e.target.value as WelcomePopup["pages"] })}
              className="field"
            >
              <option value="all">Every page</option>
              <option value="home">The home page only</option>
            </select>
          </div>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <button type="button" onClick={save} disabled={saving} className="btn btn-primary">
          {saving ? "Saving…" : "Save popup"}
        </button>
        <a href={previewUrl} target="_blank" rel="noreferrer" className="btn btn-secondary">
          <Icon name="external" className="size-4" />
          Preview the saved popup
        </a>
        <StatusLine status={status} />
      </div>
      <p className="hint">
        Changing the title, message or code shows it again to people who closed it.
      </p>
    </section>
  );
}
