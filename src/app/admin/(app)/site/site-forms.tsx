"use client";

import { type FormEvent, useState, useTransition } from "react";
import { type FormState, idle } from "@/components/admin/form";
import { Help } from "@/components/admin/help";
import { Icon } from "@/components/admin/icons";
import { SaveBar, useUnsavedGuard } from "@/components/admin/save-bar";
import { moveInList, SortControl, useDragSort } from "@/components/admin/sortable";
import { Switch } from "@/components/admin/switch";
import type { HomeTicker, WelcomePopup } from "@/lib/site-settings";
import { savePopup, saveTicker } from "./actions";

/** A form's draft: saved as a whole from the bar, with a warning before leaving unsaved. */
function useDraft<T>(initial: T, action: (value: T) => Promise<{ error: string | null }>) {
  const [draft, setDraft] = useState(initial);
  const [baseline, setBaseline] = useState(initial);
  const [state, setState] = useState<FormState>(idle);
  const [pending, startSaving] = useTransition();
  const dirty = JSON.stringify(draft) !== JSON.stringify(baseline);
  useUnsavedGuard(dirty);
  return {
    draft,
    setDraft,
    bar: {
      dirty,
      pending,
      state,
      onDiscard: () => {
        setDraft(baseline);
        setState(idle);
      },
    },
    save: (event: FormEvent) => {
      event.preventDefault();
      startSaving(async () => {
        const { error } = await action(draft);
        if (error) setState({ status: "error", message: error });
        else {
          setState({ status: "saved", at: Date.now() });
          setBaseline(draft);
        }
      });
    },
  };
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
  const { draft: ticker, setDraft: setTicker, bar, save } = useDraft(initial, saveTicker);
  const phrases = ticker.phrases;
  const setPhrases = (next: HomeTicker["phrases"]) => setTicker({ ...ticker, phrases: next });
  const sort = useDragSort((from, to) => setPhrases(moveInList(phrases, from, to)));

  return (
    <form onSubmit={save}>
      <section className="card p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-base font-bold">
            Phrases
            <Help>The scrolling band under the home page’s photo.</Help>
          </h2>
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
            <li
              key={i}
              {...sort.row(i)}
              className="sort-row grid grid-cols-[auto_1fr_auto] items-center gap-2 sm:grid-cols-[auto_1fr_1fr_auto]"
            >
              <div>
                <SortControl
                  sort={sort}
                  index={i}
                  count={phrases.length}
                  label={`phrase ${i + 1}`}
                />
              </div>
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
                className="field max-sm:order-3 max-sm:col-span-3"
              />
              <button
                type="button"
                aria-label={`Remove phrase ${i + 1}`}
                disabled={phrases.length === 1}
                onClick={() => setPhrases(phrases.filter((_, j) => j !== i))}
                className="btn btn-ghost btn-sm px-1.5 text-bad"
              >
                <Icon name="trash" className="size-4" />
              </button>
            </li>
          ))}
        </ol>
        <button
          type="button"
          disabled={phrases.length >= 8}
          onClick={() => setPhrases([...phrases, { en: "", ar: "" }])}
          className="btn btn-secondary mt-4"
        >
          <Icon name="plus" className="size-4" />
          Add a phrase
        </button>
      </section>
      <SaveBar {...bar} />
    </form>
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
}: {
  initial: WelcomePopup;
  items: { slug: string; name: string }[];
  categories: { slug: string; name: string }[];
  codes: string[];
}) {
  const { draft: popup, setDraft, bar, save } = useDraft(initial, savePopup);
  const kind = targetKind(popup.cta.target);
  const set = (patch: Partial<WelcomePopup>) => setDraft((p) => ({ ...p, ...patch }));
  const setTarget = (target: string) =>
    set({ cta: { ...popup.cta, target } as WelcomePopup["cta"] });
  const targetValue = popup.cta.target.replace(/^(item|category):/, "");

  return (
    <form onSubmit={save}>
      <div className="grid items-start gap-6 wide:grid-cols-[minmax(0,1fr)_320px]">
        <section className="card flex flex-col gap-4 p-5">
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
          <Localized
            id="popup-cta"
            label="Button"
            value={popup.cta.label}
            onChange={(label) => set({ cta: { ...popup.cta, label } })}
            max={30}
          />
          <div className="max-w-xs">
            <label htmlFor="popup-code" className="label">
              Code <span className="font-normal text-muted">(optional, with a copy button)</span>
            </label>
            <input
              id="popup-code"
              list="popup-codes"
              value={popup.code ?? ""}
              onChange={(e) =>
                set({ code: e.target.value.toUpperCase().replace(/\s/g, "") || null })
              }
              maxLength={24}
              className="field font-mono uppercase"
            />
            <datalist id="popup-codes">
              {codes.map((c) => (
                <option key={c} value={c} />
              ))}
            </datalist>
          </div>
        </section>

        <div className="flex flex-col gap-6">
          <section className="card flex items-start justify-between gap-3 p-5">
            <h2 className="font-bold">
              Show the popup
              <Help>
                Shown once to each visitor, a few seconds after they arrive, never during checkout.
                Changing the title, message or code shows it again to people who closed it.
              </Help>
            </h2>
            <label className="flex items-center gap-2">
              <Switch
                checked={popup.enabled}
                onChange={(enabled) => set({ enabled })}
                label="Show the popup"
              />
              {popup.enabled ? "On" : "Off"}
            </label>
          </section>

          <section className="card flex flex-col gap-3 p-5">
            <div>
              <label htmlFor="popup-target" className="label">
                The button goes to
              </label>
              <select
                id="popup-target"
                value={kind}
                onChange={(e) => {
                  const next = e.target.value as Target;
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
          </section>

          <section className="card flex flex-col gap-3 p-5">
            <div>
              <label htmlFor="popup-pages" className="label">
                Shows on
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
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="popup-delay" className="label">
                  After (seconds)
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
                  Again after (days)
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
            </div>
          </section>
        </div>
      </div>
      <SaveBar {...bar} />
    </form>
  );
}
